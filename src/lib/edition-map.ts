import type { Block, Edition } from "@/lib/epaper-data";

type Row = {
  edition: { id: string; edition_number: string; date_bn: string; hijri_date: string };
  pages: { id: string; page_number: number; title: string; section: string }[];
  blocks: {
    id: string;
    page_id: string;
    block_type: string;
    column_start: number;
    column_span: number;
    section: string;
    label: string;
    body: string;
    credit: string;
    image_url: string | null;
    style: unknown;
  }[];
};

/** Converts stored edition rows into the six-column sheet model used for display and print. */
export function toEdition(data: Row): Edition {
  return {
    id: data.edition.id,
    number: data.edition.edition_number,
    dateBn: data.edition.date_bn,
    hijri: data.edition.hijri_date,
    status: "published",
    pages: data.pages.map((page) => ({
      id: page.id,
      no: page.page_number,
      title: page.title,
      section: page.section,
      columns: Array.from({ length: 6 }, (_, index) =>
        data.blocks
          .filter((b) => b.page_id === page.id && b.column_start - 1 === index)
          .map(
            (b) =>
              ({
                id: b.id,
                type: b.block_type as Block["type"],
                section: b.section,
                label: b.label,
                body: b.body,
                credit: b.credit,
                imageSrc: b.image_url ?? undefined,
                columnSpan: b.column_span,
                ...(typeof b.style === "object" && b.style !== null && !Array.isArray(b.style)
                  ? (b.style as Partial<Block>)
                  : {}),
              }) as Block,
          ),
      ),
    })),
  };
}
