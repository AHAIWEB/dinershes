import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const assertEditorial = async (supabase: SupabaseClient<Database>, userId: string) => {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new Error("এই অ্যাকাউন্টে নিউজরুম ব্যবহারের অনুমতি নেই।");
};

export const bootstrapNewsroomRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: ownRole } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (ownRole) return ownRole.role;
    throw new Error("এই অ্যাকাউন্টে সম্পাদকের অনুমতি দেওয়া হয়নি।");
  });

export const fetchSourceUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ url: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertEditorial(context.supabase, context.userId);
    const { scrapeArticle } = await import("./newsroom.server");
    const scraped = await scrapeArticle(data.url);
    const { data: saved, error } = await context.supabase
      .from("source_items")
      .insert({
        source_url: scraped.url,
        source_domain: scraped.domain,
        source_title: scraped.title,
        raw_text: scraped.text,
        lead_image_url: scraped.image ?? null,
        fetch_status: "fetched",
        fetched_at: scraped.fetchedAt,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ...scraped, id: saved.id };
  });

export const createAiDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z
      .object({
        sourceId: z.string().uuid().optional(),
        title: z.string(),
        text: z.string().min(20),
        facts: z.string(),
        instructions: z.string(),
        sourceUrl: z.string().url().optional(),
        mode: z.enum(["full", "brief", "custom"]),
        fields: z.array(z.string()),
        section: z.string(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertEditorial(context.supabase, context.userId);
    const { generateNewsDraft } = await import("./newsroom.server");
    const draft = await generateNewsDraft({
      title: data.title,
      text: data.text,
      facts: data.facts,
      instructions: data.instructions,
      mode: data.mode,
      fields: data.fields,
      ...(data.sourceUrl ? { sourceUrl: data.sourceUrl } : {}),
    });
    const { data: saved, error } = await context.supabase
      .from("articles")
      .insert({
        source_id: data.sourceId ?? null,
        title: draft.title,
        subtitle: draft.subtitle,
        summary: draft.summary,
        body: draft.body,
        key_facts: draft.keyFacts,
        image_caption: draft.imageCaption,
        source_note: draft.sourceNote,
        section: data.section,
        status: "ai_draft",
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ...draft, id: saved.id };
  });

export const approveArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string(),
        subtitle: z.string(),
        summary: z.string(),
        body: z.string(),
        section: z.string(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertEditorial(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("articles")
      .update({
        ...data,
        status: "approved",
        approved_by: context.userId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Opens each story link and returns its full text and lead image, so pages show the whole report. */
export const fetchFullStories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ links: z.array(z.string().url()).max(20) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertEditorial(context.supabase, context.userId);
    const { scrapeArticle } = await import("./newsroom.server");
    return Promise.all(
      data.links.map(async (link) => {
        try {
          const a = await scrapeArticle(link);
          return { link, body: a.text, image: a.image ?? null };
        } catch {
          return { link, body: "", image: null };
        }
      }),
    );
  });
