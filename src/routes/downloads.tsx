import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/epaper/TopBar";
import { listPublishedEditions } from "@/lib/editions.functions";

export const Route = createFileRoute("/downloads")({
  head: () => ({
    meta: [
      { title: "ডাউনলোড কেন্দ্র · দিনের শেষ খবর" },
      {
        name: "description",
        content: "প্রকাশিত প্রতিটি সংস্করণের প্রতিটি পাতার PDF ও PNG প্রিন্ট ফাইল ডাউনলোড করুন।",
      },
      { property: "og:title", content: "ডাউনলোড কেন্দ্র · দিনের শেষ খবর" },
      { property: "og:description", content: "প্রকাশিত ই-পেপারের ছাপার ফাইল এক জায়গায়।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: () => listPublishedEditions({ data: {} }),
  errorComponent: () => <p className="p-8 font-serif-bn">তালিকা আনা যায়নি।</p>,
  notFoundComponent: () => <p className="p-8 font-serif-bn">পাওয়া যায়নি।</p>,
  component: Downloads,
});

function Downloads() {
  const editions = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background">
      <TopBar mode="public" />
      <main className="mx-auto max-w-[900px] px-4 py-6">
        <h1 className="font-serif-bn text-2xl font-bold">ডাউনলোড কেন্দ্র</h1>
        <p className="font-serif-bn text-xs text-newsprint-muted">
          প্রতিটি পাতা ১৩ × ২০.৫ ইঞ্চি, ছয় কলাম, পূর্ণ রঙের ছাপার ফাইল।
        </p>
        {editions.length === 0 && (
          <p className="mt-6 font-serif-bn">এখনো কোনো সংস্করণ প্রকাশিত হয়নি।</p>
        )}
        <ul className="mt-5 space-y-4">
          {editions.map((e) => (
            <li key={e.id} className="border border-newsprint-rule bg-newsprint-paper p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-serif-bn text-lg font-bold">সংস্করণ {e.edition_number}</p>
                  <p className="font-serif-bn text-xs text-newsprint-muted">{e.date_bn}</p>
                </div>
                <Link
                  to="/print/$editionId"
                  params={{ editionId: e.id }}
                  className="bg-newsprint-accent px-3 py-2 font-serif-bn text-xs text-newsprint-paper"
                >
                  মুদ্রণ ফাইল খুলুন
                </Link>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[...e.edition_pages]
                  .sort((a, b) => a.page_number - b.page_number)
                  .map((p) => (
                    <Link
                      key={p.id}
                      to="/print/$editionId"
                      params={{ editionId: e.id }}
                      hash={`pata-${p.page_number}`}
                      className="border border-newsprint-ink px-2 py-1 font-serif-bn text-xs"
                    >
                      পাতা {p.page_number} · {p.title}
                    </Link>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
