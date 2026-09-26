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
      .select("id,url,name,region,active,last_status")
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
    z.object({ url: z.string().url(), name: z.string().max(100), region: z.string().max(40) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await rolesOf(context.supabase, context.userId);
    const { error } = await context.supabase.from("rss_feeds").insert(data);
    if (error) throw new Error("ফিড যোগ করা যায়নি (আগেই থাকতে পারে)।");
    return { ok: true };
  });
