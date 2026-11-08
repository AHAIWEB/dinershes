import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PrintSheet } from "@/components/epaper/PrintSheet";
import { TopBar } from "@/components/epaper/TopBar";
import { getPublishedEdition } from "@/lib/editions.functions";
import { toEdition } from "@/lib/edition-map";
import { downloadPdf, downloadPng } from "@/lib/print-files";
import { columnFillPercent } from "@/lib/print-columns";

export const Route = createFileRoute("/print/$editionId")({
  head: () => ({
    meta: [
      { title: "মুদ্রণ ফাইল · দিনের শেষ খবর" },
      {
        name: "description",
        content: "প্রকাশিত সংস্করণের প্রতিটি পাতা ১৩ × ২০.৫ ইঞ্চি মাপে PDF ও PNG ছাপার ফাইল।",
      },
      { property: "og:title", content: "মুদ্রণ ফাইল · দিনের শেষ খবর" },
      { property: "og:description", content: "ছয়-কলাম মাপে ছাপার জন্য প্রস্তুত পাতা।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ params }) => getPublishedEdition({ data: { id: params.editionId } }),
  errorComponent: () => (
    <p className="p-8 font-serif-bn">সংস্করণটি পাওয়া যায়নি বা এখনো প্রকাশিত হয়নি।</p>
  ),
  notFoundComponent: () => <p className="p-8 font-serif-bn">সংস্করণটি পাওয়া যায়নি।</p>,
  component: PrintPage,
});

function PrintPage() {
  const loaderData = Route.useLoaderData();
  const edition = useMemo(() => toEdition(loaderData), [loaderData]);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [columnFills, setColumnFills] = useState<number[][]>([]);
  const base = `dinersheshkhobor-${edition.number}`;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const measurements = edition.pages.map((_, pageIndex) => {
        const sheet = refs.current[pageIndex];
        const grid = sheet?.querySelector<HTMLElement>("[data-newspaper-grid]");
        if (!grid) return Array.from({ length: 6 }, () => 0);
        const availableHeight = grid.clientHeight;
        const columnGap = getComputedStyle(grid).getPropertyValue("--column-gap");
        return Array.from({ length: 6 }, (_, columnIndex) => {
          const column = grid.querySelector<HTMLElement>(`[data-paper-column="${columnIndex}"]`);
          if (!column || !availableHeight) return 0;
          const measure = column.cloneNode(true) as HTMLElement;
          measure.style.setProperty("--column-gap", columnGap);
          measure.style.position = "fixed";
          measure.style.left = "-10000px";
          measure.style.top = "0";
          measure.style.width = `${column.offsetWidth}px`;
          measure.style.height = "max-content";
          measure.style.minHeight = "0";
          measure.style.maxHeight = "none";
          measure.style.overflow = "visible";
          measure.style.alignSelf = "start";
          document.body.append(measure);
          const contentHeight = measure.scrollHeight;
          measure.remove();
          return columnFillPercent(contentHeight, availableHeight);
        });
      });
      setColumnFills(measurements);
    });
    return () => cancelAnimationFrame(frame);
  }, [edition]);

  const run = async (key: string, job: () => Promise<void>) => {
    setBusy(key);
    try {
      await job();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar mode="public" />
      <div className="no-print mx-auto flex max-w-[1100px] flex-wrap items-end justify-between gap-3 px-4 pt-5">
        <div>
          <h1 className="font-serif-bn text-2xl font-bold">মুদ্রণ ফাইল · সংস্করণ {edition.number}</h1>
          <p className="font-serif-bn text-xs text-newsprint-muted">
            {edition.dateBn} · প্রতি পাতা ১৩ × ২০.৫ ইঞ্চি · ছয় কলাম · ৩০০ DPI · পূর্ণ রঙ
          </p>
        </div>
        <div className="flex gap-2">
          <button
            disabled={!!busy}
            onClick={() =>
              run("all", () =>
                downloadPdf(refs.current.filter(Boolean) as HTMLDivElement[], `${base}-sompurno`),
              )
            }
            className="bg-newsprint-accent px-3 py-2 font-serif-bn text-xs text-newsprint-paper disabled:opacity-50"
          >
            {busy === "all" ? "তৈরি হচ্ছে…" : "পুরো সংস্করণ PDF"}
          </button>
          <button
            onClick={() => window.print()}
            className="bg-newsprint-ink px-3 py-2 font-serif-bn text-xs text-newsprint-paper"
          >
            সরাসরি প্রিন্ট
          </button>
          <Link to="/downloads" className="border border-newsprint-ink px-3 py-2 font-serif-bn text-xs">
            ডাউনলোড কেন্দ্র
          </Link>
        </div>
      </div>
      <main className="mx-auto max-w-[1100px] space-y-8 px-4 py-6">
        {edition.pages.map((page, i) => (
          <section key={page.id} id={`pata-${page.no}`} className="print-page">
            <div className="no-print mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="font-serif-bn text-sm font-bold">
                পাতা {page.no} · {page.title}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={!!busy}
                  onClick={() => run(`pdf${i}`, () => downloadPdf([refs.current[i]!], `${base}-pata-${page.no}`))}
                  className="border border-newsprint-ink px-2 py-1 font-sans text-xs disabled:opacity-50"
                >
                  {busy === `pdf${i}` ? "…" : "PDF"}
                </button>
                <button
                  disabled={!!busy}
                  onClick={() => run(`png${i}`, () => downloadPng(refs.current[i]!, `${base}-pata-${page.no}`))}
                  className="border border-newsprint-ink px-2 py-1 font-sans text-xs disabled:opacity-50"
                >
                  {busy === `png${i}` ? "…" : "PNG ৩০০ DPI"}
                </button>
              </div>
            </div>
            <div className="overflow-hidden" style={{ height: "calc(20.5in * var(--pz))", ["--pz" as string]: "0.55" }}>
              <div style={{ transform: "scale(var(--pz))", transformOrigin: "top left" }}>
                <PrintSheet
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  edition={edition}
                  page={page}
                />
              </div>
            </div>
            <div className="no-print mt-3 border-t border-newsprint-rule pt-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-serif-bn text-sm font-bold">পাতা {page.no} · ছয় কলামের ভরাট</h2>
                <p className="font-serif-bn text-xs text-newsprint-muted">প্রতিটি কলামের লেখা মুদ্রণযোগ্য জায়গার তুলনায়</p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-6">
                {Array.from({ length: 6 }, (_, columnIndex) => {
                  const fill = columnFills[i]?.[columnIndex] ?? 0;
                  return (
                    <div key={columnIndex} className="min-w-0">
                      <div className="mb-1 flex justify-between gap-2 font-serif-bn text-xs">
                        <span>কলাম {columnIndex + 1}</span>
                        <span>{fill}%</span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label={`কলাম ${columnIndex + 1} ভরাট`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={fill}
                        className="h-2 overflow-hidden bg-newsprint-tint"
                      >
                        <div className="h-full bg-newsprint-accent transition-[width]" style={{ width: `${fill}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
