import { createFileRoute, Link } from "@tanstack/react-router";
import { NewspaperPage } from "@/components/epaper/NewspaperPage";
import { ShareCardStudio } from "@/components/epaper/ShareCardStudio";
import { TopBar } from "@/components/epaper/TopBar";
import { getPublishedEdition } from "@/lib/editions.functions";
import type { Block, Edition } from "@/lib/epaper-data";

export const Route = createFileRoute("/issue/$editionId")({
  head: () => ({
    meta: [
      { title: "প্রকাশিত সংস্করণ · দিনের শেষ খবর" },
      { name: "description", content: "দিনের শেষ খবরের প্রকাশিত পূর্ণাঙ্গ বাংলা ই-পেপার।" },
      { property: "og:title", content: "প্রকাশিত সংস্করণ · দিনের শেষ খবর" },
      {
        property: "og:description",
        content: "পূর্ণ রঙের ছয়-কলাম বাংলা ই-পেপার পড়ুন ও শেয়ার করুন।",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ params }) => getPublishedEdition({ data: { id: params.editionId } }),
  component: PublishedIssue,
});

function PublishedIssue() {
  const data = Route.useLoaderData();
  const edition: Edition = {
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
          .filter((block) => block.page_id === page.id && block.column_start - 1 === index)
          .map(
            (block) =>
              ({
                id: block.id,
                type: block.block_type as Block["type"],
                section: block.section,
                label: block.label,
                body: block.body,
                credit: block.credit,
                imageSrc: block.image_url ?? undefined,
                columnSpan: block.column_span,
                ...(typeof block.style === "object" &&
                block.style !== null &&
                !Array.isArray(block.style)
                  ? block.style
                  : {}),
              }) as Block,
          ),
      ),
    })),
  };
  const headline = edition.pages[0]?.columns.flat().find((block) => block.type === "headline");
  return (
    <div className="min-h-screen bg-background">
      <TopBar mode="public" />
      <div className="no-print mx-auto flex max-w-[1100px] items-center justify-between gap-3 px-4 pt-5">
        <div>
          <h1 className="font-serif-bn text-2xl font-bold">সংস্করণ {edition.number}</h1>
          <p className="font-serif-bn text-xs text-newsprint-muted">
            {edition.dateBn} · {edition.pages.length} পৃষ্ঠা
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="bg-newsprint-ink px-3 py-2 font-serif-bn text-xs text-newsprint-paper"
          >
            প্রিন্ট / PDF
          </button>
          <Link
            to="/archive"
            className="border border-newsprint-ink px-3 py-2 font-serif-bn text-xs"
          >
            আর্কাইভ
          </Link>
        </div>
      </div>
      <main className="mx-auto max-w-[1100px] space-y-8 px-4 py-6">
        {edition.pages.map((page) => (
          <div key={page.id} className="print-page">
            <NewspaperPage edition={edition} page={page} />
          </div>
        ))}
        {headline && (
          <div className="no-print">
            <ShareCardStudio
              headline={headline.label}
              section={headline.section}
              date={edition.dateBn}
              {...(headline.imageSrc ? { image: headline.imageSrc } : {})}
            />
          </div>
        )}
      </main>
    </div>
  );
}
