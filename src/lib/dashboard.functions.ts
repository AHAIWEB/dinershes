import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type Db = SupabaseClient<Database>;

async function rolesOf(supabase: Db, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role);
  if (!roles.length) throw new Error("এই অ্যাকাউন্টে সম্পাদকীয় অনুমতি নেই।");
  return roles;
}

async function assertAdmin(supabase: Db, userId: string) {
  const roles = await rolesOf(supabase, userId);
  if (!roles.includes("admin")) throw new Error("শুধু অ্যাডমিন এই কাজ করতে পারেন।");
}

/** Live counts and lists for the editor dashboard. */
export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await rolesOf(context.supabase, context.userId);
    const [{ data: editions }, { data: articles }, { data: ads }] = await Promise.all([
      context.supabase
        .from("editions")
        .select("id,edition_number,date_bn,status,approved_at,published_at,updated_at,edition_pages(page_number,status)")
        .order("created_at", { ascending: false })
        .limit(50),
      context.supabase
        .from("articles")
        .select("id,title,section,status,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      context.supabase.from("ads").select("*").order("created_at", { ascending: false }),
    ]);
    return { roles, editions: editions ?? [], articles: articles ?? [], ads: ads ?? [] };
  });

export const deleteArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await rolesOf(context.supabase, context.userId);
    const { error } = await context.supabase.from("articles").delete().eq("id", data.id);
    if (error) throw new Error("খবরটি মুছে ফেলা যায়নি (পাতায় বসানো থাকতে পারে)।");
    return { ok: true };
  });

const adSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  body: z.string().max(500),
  image_url: z.string().url().nullable(),
  column_span: z.number().int().min(1).max(6),
  active: z.boolean(),
});

export const saveAd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i) => adSchema.parse(i))
  .handler(async ({ data, context }) => {
    await rolesOf(context.supabase, context.userId);
    const { id, ...rest } = data;
    const { error } = id
      ? await context.supabase.from("ads").update(rest).eq("id", id)
      : await context.supabase.from("ads").insert({ ...rest, created_by: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await rolesOf(context.supabase, context.userId);
    const { error } = await context.supabase.from("ads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin only: all accounts with their editorial roles. */
export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (error) throw new Error(error.message);
    const { data: roles } = await context.supabase.from("user_roles").select("user_id,role");
    return users.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      roles: (roles ?? []).filter((r) => r.user_id === u.id).map((r) => r.role),
    }));
  });

export const setTeamRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i) =>
    z
      .object({
        email: z.string().email(),
        role: z.enum(["admin", "editor", "designer"]),
        remove: z.boolean().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    let user = list?.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
    if (!user && !data.remove) {
      const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email);
      if (error) throw new Error("আমন্ত্রণ পাঠানো যায়নি: " + error.message);
      user = invited.user;
    }
    if (!user) throw new Error("এই ইমেইলের অ্যাকাউন্ট নেই।");
    if (data.remove) {
      if (user.id === context.userId && data.role === "admin")
        throw new Error("নিজের অ্যাডমিন অনুমতি সরানো যাবে না।");
      const { error } = await context.supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user.id)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("user_roles")
        .upsert({ user_id: user.id, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/** RSS feeds grouped by region. */
export const listFeeds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await rolesOf(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("rss_feeds")
      .select("id,url,name,region,active,last_status,kind")
      .order("region")
      .order("name");
    return data ?? [];
  });

export const readFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await rolesOf(context.supabase, context.userId);
    const { data: feed } = await context.supabase
      .from("rss_feeds")
      .select("url")
      .eq("id", data.id)
      .single();
    if (!feed) throw new Error("ফিড পাওয়া যায়নি।");
    const { fetchFeed } = await import("./newsroom.server");
    try {
      const items = await fetchFeed(feed.url);
      await context.supabase
        .from("rss_feeds")
        .update({ last_status: "ok", last_checked_at: new Date().toISOString() })
        .eq("id", data.id);
      return { items, error: null as string | null };
    } catch (e) {
      await context.supabase
        .from("rss_feeds")
        .update({ last_status: "error", last_checked_at: new Date().toISOString() })
        .eq("id", data.id);
      return { items: [], error: e instanceof Error ? e.message : "ফিড পড়া যায়নি।" };
    }
  });

export const addFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i) =>
    z.object({ url: z.string().url(), name: z.string().max(100), region: z.string().max(40), kind: z.enum(["feed", "site"]).optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await rolesOf(context.supabase, context.userId);
    const { error } = await context.supabase.from("rss_feeds").insert({ url: data.url, name: data.name, region: data.region, kind: data.kind ?? "feed" });
    if (error) throw new Error("ফিড যোগ করা যায়নি (আগেই থাকতে পারে)।");
    return { ok: true };
  });

export const updateFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().max(100).optional(),
        region: z.string().max(40).optional(),
        active: z.boolean().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await rolesOf(context.supabase, context.userId);
    const rest: { name?: string; region?: string; active?: boolean } = {};
    if (data.name !== undefined) rest.name = data.name;
    if (data.region !== undefined) rest.region = data.region;
    if (data.active !== undefined) rest.active = data.active;
    const { error } = await context.supabase.from("rss_feeds").update(rest).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await rolesOf(context.supabase, context.userId);
    const { error } = await context.supabase.from("rss_feeds").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Reads every active feed in a category and returns items whose title or summary match the query. */
export const searchFeeds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i) => z.object({ region: z.string().max(40), query: z.string().max(100) }).parse(i))
  .handler(async ({ data, context }) => {
    await rolesOf(context.supabase, context.userId);
    const { data: feeds } = await context.supabase
      .from("rss_feeds")
      .select("id,url,name")
      .eq("region", data.region)
      .eq("active", true)
      .eq("kind", "feed");
    const { fetchFeed } = await import("./newsroom.server");
    const needle = data.query.trim().toLocaleLowerCase("bn");
    const results = await Promise.all(
      (feeds ?? []).map(async (f) => {
        try {
          const items = await fetchFeed(f.url);
          await context.supabase.from("rss_feeds").update({ last_status: "ok", last_checked_at: new Date().toISOString() }).eq("id", f.id);
          return items.map((it) => ({ ...it, feedId: f.id, feedName: f.name }));
        } catch {
          await context.supabase.from("rss_feeds").update({ last_status: "error", last_checked_at: new Date().toISOString() }).eq("id", f.id);
          return [];
        }
      }),
    );
    return results
      .flat()
      .filter((it) => !needle || `${it.title} ${it.summary}`.toLocaleLowerCase("bn").includes(needle))
      .slice(0, 150);
  });

export const listSaved = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await rolesOf(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("saved_stories")
      .select("id,title,link,summary,image_url,category,created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    return data ?? [];
  });

export const saveStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i) =>
    z
      .object({
        title: z.string().min(1).max(300),
        link: z.string().url(),
        summary: z.string().max(1000),
        image: z.string().url().optional(),
        category: z.string().max(40),
        feedId: z.string().uuid().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await rolesOf(context.supabase, context.userId);
    const { error } = await context.supabase.from("saved_stories").upsert(
      {
        title: data.title,
        link: data.link,
        summary: data.summary,
        image_url: data.image ?? null,
        category: data.category,
        feed_id: data.feedId ?? null,
        created_by: context.userId,
      },
      { onConflict: "link" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSaved = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await rolesOf(context.supabase, context.userId);
    const { error } = await context.supabase.from("saved_stories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const designSchema = z.object({
  preset: z.string().max(30),
  headline: z.number().min(0.8).max(2.4),
  title: z.number().min(0.7).max(1.6),
  subtitle: z.number().min(0.5).max(1),
  body: z.number().min(0.6).max(1),
  lineHeight: z.number().min(1.2).max(1.9),
  imageRatio: z.enum(["auto", "16/9", "4/3", "3/2", "1/1"]),
  kicker: z.enum(["accent", "ink", "hidden"]),
  rules: z.boolean(),
  headlineFont: z.enum(["serif", "display"]),
});

/** Saves one house design for a whole unpublished edition so all four pages look alike. */
export const saveEditionDesign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i) => z.object({ id: z.string().uuid(), design: designSchema }).parse(i))
  .handler(async ({ data, context }) => {
    await rolesOf(context.supabase, context.userId);
    const { data: ed } = await context.supabase.from("editions").select("status").eq("id", data.id).single();
    if (!ed) throw new Error("সংস্করণ পাওয়া যায়নি।");
    if (ed.status === "published") throw new Error("প্রকাশিত সংস্করণের ডিজাইন বদলানো যাবে না।");
    const { error } = await context.supabase.from("editions").update({ design: data.design }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
