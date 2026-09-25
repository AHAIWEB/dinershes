import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateNewsDraft, scrapeArticle } from "./newsroom.server";

const assertEditorial = async (supabase: any, userId: string) => {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  if (!data) throw new Error("এই অ্যাকাউন্টে নিউজরুম ব্যবহারের অনুমতি নেই।");
};

export const bootstrapNewsroomRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: ownRole } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).maybeSingle();
    if (ownRole) return ownRole.role;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true });
    if (count === 0) {
      await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role: "admin" });
      return "admin" as const;
    }
    throw new Error("অ্যাডমিন এখনো এই অ্যাকাউন্টে newsroom role দেননি।");
  });

export const fetchSourceUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ url: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertEditorial(context.supabase, context.userId);
    const scraped = await scrapeArticle(data.url);
    const { data: saved, error } = await context.supabase.from("source_items").insert({
      source_url: scraped.url, source_domain: scraped.domain, source_title: scraped.title,
      raw_text: scraped.text, lead_image_url: scraped.image ?? null, fetch_status: "fetched",
      fetched_at: scraped.fetchedAt, created_by: context.userId,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { ...scraped, id: saved.id };
  });

export const createAiDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    sourceId: z.string().uuid().optional(), title: z.string(), text: z.string().min(20), facts: z.string(),
    instructions: z.string(), sourceUrl: z.string().url().optional(), mode: z.enum(["full", "brief", "custom"]),
    fields: z.array(z.string()), section: z.string(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertEditorial(context.supabase, context.userId);
    const draft = await generateNewsDraft({ ...data, ...(data.sourceUrl ? { sourceUrl: data.sourceUrl } : {}) });
    const { data: saved, error } = await context.supabase.from("articles").insert({
      source_id: data.sourceId ?? null, title: draft.title, subtitle: draft.subtitle, summary: draft.summary,
      body: draft.body, key_facts: draft.keyFacts, image_caption: draft.imageCaption,
      source_note: draft.sourceNote, section: data.section, status: "ai_draft", created_by: context.userId,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { ...draft, id: saved.id };
  });

export const approveArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), title: z.string(), subtitle: z.string(), summary: z.string(), body: z.string(), section: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertEditorial(context.supabase, context.userId);
    const { error } = await context.supabase.from("articles").update({ ...data, status: "approved", approved_by: context.userId, approved_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });