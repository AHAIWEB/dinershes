import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const json = (payload: unknown, status = 200) =>
  Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/public/feed-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authorization = request.headers.get("authorization") ?? "";
        const token = /^Bearer ([\w.-]+)$/.exec(authorization)?.[1];
        if (!token || token.length > 8192) return json({ error: "সম্পাদকীয় সাইন-ইন দরকার।" }, 401);
        if (Number(request.headers.get("content-length") ?? 0) > 1024) {
          return json({ error: "অনুরোধটি গ্রহণ করা যায়নি।" }, 413);
        }

        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!url || !key) return json({ error: "ফিড সংরক্ষণের সেবা এখন প্রস্তুত নয়।" }, 503);

        const client = createClient<Database>(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            headers: { Authorization: `Bearer ${token}` },
            fetch: (input, init) => {
              const headers = new Headers(
                typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
              );
              if (init?.headers) new Headers(init.headers).forEach((value, name) => headers.set(name, value));
              if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
                headers.delete("Authorization");
              }
              headers.set("apikey", key);
              headers.set("Authorization", `Bearer ${token}`);
              return fetch(input, { ...init, headers });
            },
          },
        });

        const { data: auth, error: authError } = await client.auth.getUser(token);
        if (authError || !auth.user) return json({ error: "সম্পাদকীয় সাইন-ইন মেয়াদোত্তীর্ণ।" }, 401);
        const { data: roles, error: roleError } = await client
          .from("user_roles")
          .select("role")
          .eq("user_id", auth.user.id);
        if (roleError || !roles?.length) return json({ error: "এই অ্যাকাউন্টে সম্পাদকীয় অনুমতি নেই।" }, 403);

        const { data: feeds, error: feedError } = await client
          .from("rss_feeds")
          .select("id,url,region")
          .eq("active", true)
          .eq("kind", "feed")
          .order("id")
          .limit(40);
        if (feedError) return json({ error: "সক্রিয় ফিডের তালিকা আনা যায়নি।" }, 502);

        const { fetchFeed } = await import("@/lib/newsroom.server");
        let cursor = 0;
        let storiesSaved = 0;
        let feedErrors = 0;
        const worker = async () => {
          while (cursor < (feeds ?? []).length) {
            const index = cursor;
            cursor += 1;
            const feed = feeds?.[index];
            if (!feed) continue;
            try {
              const items = (await fetchFeed(feed.url)).slice(0, 10);
              if (items.length) {
                const rows = items
                  .filter((item) => item.title.trim() && /^https?:\/\//.test(item.link))
                  .map((item) => ({
                    title: item.title.trim().slice(0, 300),
                    link: item.link,
                    summary: item.summary.slice(0, 1000),
                    image_url: item.image ?? null,
                    category: feed.region.slice(0, 40),
                    feed_id: feed.id,
                    created_by: auth.user.id,
                  }));
                if (rows.length) {
                  const { data: inserted, error } = await client
                    .from("saved_stories")
                    .upsert(rows, { onConflict: "link", ignoreDuplicates: true })
                    .select("id");
                  if (error) throw error;
                  storiesSaved += inserted?.length ?? 0;
                }
              }
              await client.from("rss_feeds").update({ last_status: "ok", last_checked_at: new Date().toISOString() }).eq("id", feed.id);
            } catch {
              feedErrors += 1;
              await client.from("rss_feeds").update({ last_status: "error", last_checked_at: new Date().toISOString() }).eq("id", feed.id);
            }
          }
        };
        await Promise.all(Array.from({ length: Math.min(4, feeds?.length ?? 0) }, () => worker()));
        return json({ feedsChecked: feeds?.length ?? 0, storiesSaved, feedErrors });
      },
    },
  },
});