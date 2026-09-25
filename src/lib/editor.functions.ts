import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const blockSchema = z.object({
  type: z.enum(["headline", "article", "image", "ad", "quote", "divider"]),
  section: z.string(), label: z.string(), body: z.string().optional(), credit: z.string().optional(),
  imageSrc: z.string().optional(), columnSpan: z.number().int().min(1).max(6).optional(),
  imageWidth: z.number().optional(), imageHeight: z.number().optional(), fit: z.enum(["cover", "contain", "fill"]).optional(),
  radius: z.number().optional(), align: z.enum(["left", "center", "right"]).optional(),
  fontScale: z.number().optional(), margin: z.object({top:z.number(),right:z.number(),bottom:z.number(),left:z.number()}).optional(),
  padding: z.object({top:z.number(),right:z.number(),bottom:z.number(),left:z.number()}).optional(), invert: z.boolean().optional(),
});
const inputSchema = z.object({
  editionId: z.string().uuid().optional(), number: z.string(), dateBn: z.string(), hijri: z.string(),
  status: z.enum(["draft", "review", "scheduled", "published"]),
  scheduledFor: z.string().datetime().optional(),
  pages: z.array(z.object({ title: z.string(), section: z.string(), columns: z.array(z.array(blockSchema)).length(6) })).length(4),
});

export const loadEditorialEdition = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).limit(1).maybeSingle();
    if (!role) throw new Error("সম্পাদনার অনুমতি নেই।");
    const { data: edition, error } = await context.supabase.from("editions")
      .select("id,edition_number,date_bn,hijri_date,status,scheduled_for")
      .neq("status", "published").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    if (!edition) return null;
    const { data: pages, error: pageError } = await context.supabase.from("edition_pages")
      .select("id,page_number,title,section").eq("edition_id", edition.id).order("page_number");
    if (pageError) throw new Error(pageError.message);
    const ids = (pages ?? []).map((p) => p.id);
    const { data: blocks, error: blockError } = ids.length
      ? await context.supabase.from("page_blocks").select("*").in("page_id", ids).order("sort_order")
      : { data: [], error: null };
    if (blockError) throw new Error(blockError.message);
    return {
      edition,
      pages: (pages ?? []).map((page) => ({ ...page,
        columns: Array.from({length: 6}, (_, ci) => (blocks ?? [])
          .filter((block) => block.page_id === page.id && block.column_start === ci + 1)
          .map((block) => ({ id: block.id, type: block.block_type, section: block.section, label: block.label,
            body: block.body, credit: block.credit, imageSrc: block.image_url ?? "", columnSpan: block.column_span,
            ...(block.style && typeof block.style === "object" && !Array.isArray(block.style) ? block.style : {}),
          }))),
      })),
    };
  });

export const saveEditorialEdition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: role } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).limit(1).maybeSingle();
    if (!role) throw new Error("সম্পাদনার অনুমতি নেই।");
    if (data.status === "scheduled" && !data.scheduledFor) throw new Error("প্রকাশের সময় নির্বাচন করুন।");
    let editionId = data.editionId;
    if (editionId) {
      const { data: existing } = await context.supabase.from("editions").select("status").eq("id", editionId).single();
      if (!existing || existing.status === "published") throw new Error("প্রকাশিত সংস্করণ পরিবর্তন করা যাবে না।");
      const { error } = await context.supabase.from("editions").update({ status: data.status, scheduled_for: data.scheduledFor ?? null,
        published_at: data.status === "published" ? new Date().toISOString() : null,
        edition_number: data.number, date_bn: data.dateBn, hijri_date: data.hijri,
      }).eq("id", editionId);
      if (error) throw new Error(error.message);
    } else {
      const { data: created, error } = await context.supabase.from("editions").insert({
        edition_number: data.number, publication_date: new Date().toISOString().slice(0, 10),
        date_bn: data.dateBn, hijri_date: data.hijri, status: "draft", created_by: context.userId,
      }).select("id").single();
      if (error) throw new Error(error.message);
      editionId = created.id;
    }
    const { data: oldPages, error: pagesError } = await context.supabase.from("edition_pages").select("id,page_number").eq("edition_id", editionId);
    if (pagesError) throw new Error(pagesError.message);
    for (let index = 0; index < data.pages.length; index++) {
      const page = data.pages[index];
      if (!page) continue;
      let pageId = oldPages?.find((p) => p.page_number === index + 1)?.id;
      if (!pageId) {
        const { data: created, error } = await context.supabase.from("edition_pages").insert({ edition_id: editionId,
          page_number: index + 1, title: page.title, section: page.section }).select("id").single();
        if (error) throw new Error(error.message);
        pageId = created.id;
      } else {
        const { error } = await context.supabase.from("edition_pages").update({ title: page.title, section: page.section }).eq("id", pageId);
        if (error) throw new Error(error.message);
      }
      const { error: deleteError } = await context.supabase.from("page_blocks").delete().eq("page_id", pageId);
      if (deleteError) throw new Error(deleteError.message);
      const rows = page.columns.flatMap((column, ci) => column.map((block, bi) => ({
        page_id: pageId, block_type: block.type, sort_order: bi, column_start: ci + 1,
        column_span: Math.min(6 - ci, block.columnSpan ?? 1), section: block.section, label: block.label,
        body: block.body ?? "", credit: block.credit ?? "", image_url: block.imageSrc || null,
        style: { imageWidth: block.imageWidth, imageHeight: block.imageHeight, fit: block.fit, radius: block.radius,
          align: block.align, fontScale: block.fontScale, margin: block.margin, padding: block.padding, invert: block.invert },
      })));
      if (rows.length) {
        const { error } = await context.supabase.from("page_blocks").insert(rows);
        if (error) throw new Error(error.message);
      }
    }
    if (data.status !== "draft") {
      const { error } = await context.supabase.from("editions").update({ status: data.status, scheduled_for: data.scheduledFor ?? null,
        published_at: data.status === "published" ? new Date().toISOString() : null }).eq("id", editionId);
      if (error) throw new Error(error.message);
    }
    return { id: editionId };
  });