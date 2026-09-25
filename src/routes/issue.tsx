import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/epaper/TopBar";
import { NewspaperPage } from "@/components/epaper/NewspaperPage";
import { initialEdition } from "@/lib/epaper-data";

export const Route = createFileRoute("/issue")({
  head: () => ({
    meta: [
      { title: "সম্পূর্ণ সংস্করণ · দিনের শেষ খবর ই-পেপার" },
      {
        name: "description",
        content: "দিনের শেষ খবর ই-পেপারের চার পৃষ্ঠার সম্পূর্ণ সংস্করণ—পড়ুন, প্রিন্ট করুন বা PDF নিন।",
      },
      { property: "og:title", content: "সম্পূর্ণ সংস্করণ · দিনের শেষ খবর" },
      {
        property: "og:description",
        content: "চার পৃষ্ঠার প্রিন্ট-রেডি বাংলা ই-পেপার সংস্করণ।",
      },
    ],
  }),
  component: IssuePage,
});

function IssuePage() {
  const edition = initialEdition;
  return (
    <div className="min-h-screen bg-background">
      <TopBar mode="public" />
      <div className="no-print mx-auto grid max-w-[1000px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 pt-5 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-serif-bn text-2xl font-bold">সংস্করণ {edition.number}</h1>
          <p className="font-serif-bn text-xs text-newsprint-muted">{edition.dateBn} · ৪ পৃষ্ঠা</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => window.print()}
            className="rounded-md bg-newsprint-ink px-3 py-2 font-sans text-xs text-newsprint-paper"
          >
            ⎙ Print / PDF
          </button>
          <Link to="/" className="rounded-md border border-newsprint-ink px-3 py-2 font-sans text-xs">
            হোম
          </Link>
        </div>
      </div>
      <main className="mx-auto max-w-[1000px] space-y-8 px-4 py-6">
        {edition.pages.map((p) => (
          <div key={p.id} className="print-page">
            <NewspaperPage edition={edition} page={p} />
          </div>
        ))}
      </main>
    </div>
  );
}
