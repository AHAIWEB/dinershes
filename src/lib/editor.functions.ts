import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const blockSchema = z.object({
  type: z.enum(["headline", "article", "image", "ad", "quote", "divider"]),
  section: z.string(),
  label: z.string(),
  body: z.string().optional(),
  credit: z.string().optional(),
  imageSrc: z.string().optional(),
  columnSpan: z.number().int().min(1).max(6).optional(),
  imageWidth: z.number().optional(),
  imageHeight: z.number().optional(),
  fit: z.enum(["cover", "contain", "fill"]).optional(),
  radius: z.number().optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  fontScale: z.number().optional(),
  margin: z
    .object({ top: z.number(), right: z.number(), bottom: z.number(), left: z.number() })
    .optional(),
  padding: z
    .object({ top: z.number(), right: z.number(), bottom: z.number(), left: z.number() })
    .optional(),
  invert: z.boolean().optional(),
  treatment: z.enum(["standard", "banner", "boxed", "highlight"]).optional(),
});
const inputSchema = z.object({
  editionId: z.string().uuid().optional(),
  number: z.string(),
  dateBn: z.string(),
  hijri: z.string(),
  status: z.enum(["draft", "review"]),
  pages: z
    .array(
      z.object({
        title: z.string(),
        section: z.string(),
        columns: z.array(z.array(blockSchema)).length(6),
      }),
    )
    .length(4),
});

export const loadEditorialEdition = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();
    if (!role) throw new Error("সম্পাদনার অনুমতি নেই।");
    const { data: edition, error } = await context.supabase
      .from("editions")
      .select("id,edition_number,date_bn,hijri_date,status,approved_at")
      .neq("status", "published")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!edition) return null;
    const { data: pages, error: pageError } = await context.supabase
      .from("edition_pages")
      .select("id,page_number,title,section,status")
      .eq("edition_id", edition.id)
      .order("page_number");
    if (pageError) throw new Error(pageError.message);
    const ids = (pages ?? []).map((p) => p.id);
    const { data: blocks, error: blockError } = ids.length
      ? await context.supabase
          .from("page_blocks")
          .select("*")
          .in("page_id", ids)
          .order("sort_order")
      : { data: [], error: null };
    if (blockError) throw new Error(blockError.message);
    return {
      edition,
      pages: (pages ?? []).map((page) => ({
        ...page,
        columns: Array.from({ length: 6 }, (_, ci) =>
          (blocks ?? [])
            .filter((block) => block.page_id === page.id && block.column_start === ci + 1)
            .map((block) => ({
              id: block.id,
              type: block.block_type,
              section: block.section,
              label: block.label,
              body: block.body,
              credit: block.credit,
              imageSrc: block.image_url ?? "",
              columnSpan: block.column_span,
              ...(block.style && typeof block.style === "object" && !Array.isArray(block.style)
                ? block.style
                : {}),
            })),
        ),
      })),
    };
  });

export const saveEditorialEdition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();
    if (!role) throw new Error("সম্পাদনার অনুমতি নেই।");
    let editionId = data.editionId;
    if (editionId) {
      const { data: existing } = await context.supabase
        .from("editions")
        .select("status")
        .eq("id", editionId)
        .single();
      if (!existing || existing.status === "published")
        throw new Error("প্রকাশিত সংস্করণ পরিবর্তন করা যাবে না।");
      const { error } = await context.supabase
        .from("editions")
        .update({
          edition_number: data.number,
          date_bn: data.dateBn,
          hijri_date: data.hijri,
        })
        .eq("id", editionId);
      if (error) throw new Error(error.message);
    } else {
      const { data: created, error } = await context.supabase
        .from("editions")
        .insert({
          edition_number: data.number,
          publication_date: new Date().toISOString().slice(0, 10),
          date_bn: data.dateBn,
          hijri_date: data.hijri,
          status: "draft",
          created_by: context.userId,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      editionId = created.id;
    }
    const { data: oldPages, error: pagesError } = await context.supabase
      .from("edition_pages")
      .select("id,page_number,status")
      .eq("edition_id", editionId);
    if (pagesError) throw new Error(pagesError.message);
    for (let index = 0; index < data.pages.length; index++) {
      const page = data.pages[index];
      if (!page) continue;
      const old = oldPages?.find((p) => p.page_number === index + 1);
      if (old?.status === "published") continue; // published pages are frozen
      let pageId = old?.id;
      if (!pageId) {
        const { data: created, error } = await context.supabase
          .from("edition_pages")
          .insert({
            edition_id: editionId,
            page_number: index + 1,
            title: page.title,
            section: page.section,
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        pageId = created.id;
      } else {
        const { error } = await context.supabase
          .from("edition_pages")
          .update({ title: page.title, section: page.section, status: "draft" })
          .eq("id", pageId);
        if (error) throw new Error(error.message);
      }
      const { error: deleteError } = await context.supabase
        .from("page_blocks")
        .delete()
        .eq("page_id", pageId);
      if (deleteError) throw new Error(deleteError.message);
      const rows = page.columns.flatMap((column, ci) =>
        column.map((block, bi) => ({
          page_id: pageId,
          block_type: block.type,
          sort_order: bi,
          column_start: ci + 1,
          column_span: Math.min(6 - ci, block.columnSpan ?? 1),
          section: block.section,
          label: block.label,
          body: block.body ?? "",
          credit: block.credit ?? "",
          image_url: block.imageSrc || null,
          style: {
            imageWidth: block.imageWidth,
            imageHeight: block.imageHeight,
            fit: block.fit,
            radius: block.radius,
            align: block.align,
            fontScale: block.fontScale,
            margin: block.margin,
            padding: block.padding,
            invert: block.invert,
             treatment: block.treatment,
          },
        })),
      );
      if (rows.length) {
        const { error } = await context.supabase.from("page_blocks").insert(rows);
        if (error) throw new Error(error.message);
      }
    }
    const { error: statusError } = await context.supabase
      .from("editions")
      .update({
        status: data.status,
      })
      .eq("id", editionId);
    if (statusError) throw new Error(statusError.message);
    return { id: editionId };
  });

const workflowSchema = z.object({
  editionId: z.string().uuid(),
  scope: z.enum(["edition", "page"]),
  pageNumber: z.number().int().min(1).max(4).optional(),
  action: z.enum(["approve", "publish"]),
});

/** Manual approval/publication. The database trigger re-checks role + approval. */
export const runEditorialWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => workflowSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "admin" || r.role === "editor"))
      throw new Error("শুধু সম্পাদক অনুমোদন ও প্রকাশ করতে পারেন।");
    const status = data.action === "approve" ? "approved" : "published";
    if (data.scope === "edition") {
      const { error } = await context.supabase
        .from("editions")
        .update({ status })
        .eq("id", data.editionId);
      if (error) throw new Error(error.message);
    } else {
      if (!data.pageNumber) throw new Error("পাতা নির্বাচন করুন।");
      const { error } = await context.supabase
        .from("edition_pages")
        .update({ status })
        .eq("edition_id", data.editionId)
        .eq("page_number", data.pageNumber);
      if (error) throw new Error(error.message);
    }
    return { ok: true, status };
  });

/** Approved newsroom articles for auto-layout, filtered by section when given. */
export const listApprovedArticles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ section: z.string().optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("articles")
      .select("id,title,subtitle,summary,body,section,image_caption,source_items(lead_image_url)")
      .in("status", ["approved", "placed"])
      .order("approved_at", { ascending: false })
      .limit(12);
    if (data.section) query = query.eq("section", data.section);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      summary: row.summary,
      body: row.body,
      section: row.section,
      imageCaption: row.image_caption,
      image: (row.source_items as { lead_image_url: string | null } | null)?.lead_image_url ?? null,
    }));
  });
