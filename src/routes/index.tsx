import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/epaper/TopBar";
import { NewspaperPage } from "@/components/epaper/NewspaperPage";
import { SECTIONS, type Block, type Edition } from "@/lib/epaper-data";
import { getPublishedEdition, listPublishedEditions } from "@/lib/editions.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "দিনের শেষ খবর · আজকের ই-পেপার" },
      {
        name: "description",
        content:
          "দিনের শেষ খবর — সারাদিনের টপ খবর নিয়ে চার পৃষ্ঠার প্রিন্ট-রেডি বাংলা ই-পেপার, প্রতিদিন সন্ধ্যায়।",
      },
      { property: "og:title", content: "দিনের শেষ খবর · আজকের ই-পেপার" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:description",
        content: "সারাদিনের টপ খবর এক পাতায়—PDF ও প্রিন্ট-রেডি বাংলা ই-পেপার।",
      },
    ],
  }),
  loader: async () => {
    const editions = await listPublishedEditions({ data: {} });
    return editions[0] ? getPublishedEdition({ data: { id: editions[0].id } }) : null;
  },
  component: PublicSite,
});

function PublicSite() {
  const published = Route.useLoaderData();
  const edition: Edition | null = published ? {
    id: published.edition.id, number: published.edition.edition_number,
    dateBn: published.edition.date_bn, hijri: published.edition.hijri_date, status: "published",
    pages: published.pages.map((page) => ({ id: page.id, no: page.page_number, title: page.title, section: page.section,
      columns: Array.from({ length: 6 }, (_, index) => published.blocks
        .filter((block) => block.page_id === page.id && block.column_start === index + 1)
        .map((block) => ({ id: block.id, type: block.block_type as Block["type"], section: block.section,
          label: block.label, body: block.body, credit: block.credit, imageSrc: block.image_url ?? undefined,
          columnSpan: block.column_span,
          ...(typeof block.style === "object" && block.style !== null && !Array.isArray(block.style) ? block.style : {}),
        } as Block))),
    })),
  } : null;
  const front = edition?.pages[0];

  return (
    <div className="min-h-screen bg-background">
      <TopBar mode="public" />

      <div className="no-print border-b border-newsprint-rule bg-newsprint-paper">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
          {SECTIONS.slice(0, 7).map((s, i) => (
            <span
              key={s}
              className={`font-serif-bn text-sm ${i === 0 ? "text-newsprint-accent" : "text-newsprint-body"}`}
            >
              {s}
            </span>
          ))}
          <span className="ml-auto font-serif-bn text-xs text-newsprint-muted">
            {edition?.dateBn ?? "প্রকাশের অপেক্ষায়"}
          </span>
        </div>
      </div>

      <main className="mx-auto max-w-[1400px] px-4 py-6">
        {edition && front ? <NewspaperPage edition={edition} page={front} /> : <div className="py-24 text-center font-serif-bn"><h1 className="font-display-bn text-4xl text-newsprint-accent">দিনের শেষ খবর</h1><p className="mt-4 text-newsprint-muted">প্রকাশিত সংস্করণ শিগগিরই এখানে আসবে।</p></div>}

        {edition && <>
        <section className="mt-8">
          <h2 className="border-b border-newsprint-ink pb-2 font-serif-bn text-lg font-bold">
            আজকের আরও খবর
          </h2>
          <div className="mt-4 grid gap-6 md:grid-cols-3">
            {edition.pages.slice(1).map((p) => {
              const b = p.columns[0]?.[0];
              if (!b) return null;
              return (
                <article key={p.id}>
                  <span className="font-sans text-[0.55rem] uppercase tracking-[0.2em] text-newsprint-accent">
                    {p.title}
                  </span>
                  <h3 className="mt-1 font-serif-bn text-xl font-bold leading-snug">{b.label}</h3>
                  <p className="mt-1 font-serif-bn text-sm text-newsprint-body">{b.body}</p>
                  <Link
                    to="/issue/$editionId" params={{ editionId: edition.id }}
                    className="mt-2 inline-block font-serif-bn text-sm text-newsprint-accent"
                  >
                    আরও পড়ুন →
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-10 border border-newsprint-rule bg-newsprint-tint p-4 sm:p-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-serif-bn text-xl font-bold">আজকের ই-পেপার</h2>
              <p className="font-serif-bn text-xs text-newsprint-muted">
                চার পৃষ্ঠার সম্পূর্ণ সংস্করণ · প্রিন্ট ও পিডিএফ
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                to="/issue/$editionId" params={{ editionId: edition.id }}
                className="rounded-md border border-newsprint-ink px-3 py-2 font-sans text-xs"
              >
                সব পৃষ্ঠা
              </Link>
              <a
                href={`/issue/${edition.id}`}
                className="rounded-md bg-newsprint-ink px-3 py-2 font-sans text-xs text-newsprint-paper"
              >
                ⎙ প্রিন্ট
              </a>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {edition.pages.map((p) => (
              <Link
                key={p.id}
                to="/issue/$editionId" params={{ editionId: edition.id }}
                className="block border border-newsprint-rule bg-newsprint-paper p-2 transition-shadow hover:shadow-paper"
              >
                 <div className="aspect-[13/20.5] overflow-hidden">
                  <div className="origin-top-left scale-[0.34] [width:294%]">
                    <NewspaperPage edition={edition} page={p} />
                  </div>
                </div>
                <div className="mt-2 flex justify-between font-serif-bn text-[0.7rem] text-newsprint-muted">
                   <span>পৃষ্ঠা {p.no}</span>
                  <span>{p.title}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
        </>}
      </main>

      <footer className="no-print border-t border-newsprint-rule px-4 py-6 text-center font-serif-bn text-xs text-newsprint-muted">
        © ২০২৬ দিনের শেষ খবর · সর্বস্বত্ব সংরক্ষিত
      </footer>
    </div>
  );
}
