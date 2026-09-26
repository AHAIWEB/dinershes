import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const url = process.env["SUPABASE_URL"];
  if (!key || !url) throw new Error("Archive service is unavailable.");
  return createClient<Database>(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`)
          headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export const listPublishedEditions = createServerFn({ method: "GET" })
  .validator((input) =>
    z
      .object({
        month: z.string().optional(),
        section: z.string().optional(),
        query: z.string().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    let query = publicClient()
      .from("editions")
      .select(
        "id,edition_number,publication_date,date_bn,hijri_date,published_at,edition_pages(id,page_number,title,section)",
      )
      .eq("status", "published")
      .order("publication_date", { ascending: false });
    if (data.month)
      query = query
        .gte("publication_date", `${data.month}-01`)
        .lt("publication_date", `${data.month}-32`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []).filter((edition) => {
      const sectionMatch =
        !data.section || edition.edition_pages.some((page) => page.section === data.section);
      const needle = data.query?.trim().toLocaleLowerCase("bn");
      const textMatch =
        !needle ||
        `${edition.edition_number} ${edition.date_bn} ${edition.edition_pages.map((page) => `${page.title} ${page.section}`).join(" ")}`
          .toLocaleLowerCase("bn")
          .includes(needle);
      return sectionMatch && textMatch;
    });
  });

export const getPublishedEdition = createServerFn({ method: "GET" })
  .validator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const client = publicClient();
    const { data: edition, error } = await client
      .from("editions")
      .select("id,edition_number,publication_date,date_bn,hijri_date,status")
      .eq("id", data.id)
      .eq("status", "published")
      .single();
    if (error) throw new Error("প্রকাশিত সংস্করণটি পাওয়া যায়নি।");
    const { data: pages } = await client
      .from("edition_pages")
      .select("id,page_number,title,section")
      .eq("edition_id", data.id)
      .order("page_number");
    const pageIds = (pages ?? []).map((page) => page.id);
    const { data: blocks } = pageIds.length
      ? await client.from("page_blocks").select("*").in("page_id", pageIds).order("sort_order")
      : { data: [] };
    return { edition, pages: pages ?? [], blocks: blocks ?? [] };
  });
