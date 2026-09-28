import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AuthGate } from "@/components/epaper/AuthGate";
import { TopBar } from "@/components/epaper/TopBar";
import { NewspaperPage } from "@/components/epaper/NewspaperPage";
import { loadEditorialEdition } from "@/lib/editor.functions";
import { saveEditionDesign } from "@/lib/dashboard.functions";
import { DESIGN_PRESETS, toDesign, type Block, type Edition, type PageDesign } from "@/lib/epaper-data";

export const Route = createFileRoute("/design")({
  head: () => ({
    meta: [
      { title: "পাতার ডিজাইন সেটিংস · দিনের শেষ খবর" },
      { name: "description", content: "পুরো সংস্করণের চার পাতার জন্য একটি সামগ্রিক শিরোনাম, সারাংশ ও ছবির ডিজাইন।" },
      { property: "og:title", content: "পাতার ডিজাইন সেটিংস · দিনের শেষ খবর" },
      { property: "og:description", content: "সব পাতা এক ধরনের দেখাতে সামগ্রিক ডিজাইন।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AuthGate>
      <DesignPage />
    </AuthGate>
  ),
});

function DesignPage() {
  const load = useServerFn(loadEditorialEdition);
  const save = useServerFn(saveEditionDesign);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [d, setD] = useState<PageDesign>(toDesign(null));
  const [pageIndex, setPageIndex] = useState(0);
  const [msg, setMsg] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    load()
      .then((s) => {
        setLoaded(true);
        if (!s) return;
        setD(toDesign(s.edition.design));
        setEdition({
          id: s.edition.id,
          number: s.edition.edition_number,
          dateBn: s.edition.date_bn,
          hijri: s.edition.hijri_date,
          status: s.edition.status as Edition["status"],
          pages: s.pages.map((p) => ({ id: p.id, no: p.page_number, title: p.title, section: p.section, columns: p.columns as Block[][] })),
        });
      })
      .catch((e) => {
        setLoaded(true);
        setMsg(String(e.message ?? e));
      });
  }, []);

  const set = <K extends keyof PageDesign>(k: K, v: PageDesign[K]) => setD((p) => ({ ...p, [k]: v, preset: "custom" }));
  const slider = (label: string, k: "headline" | "title" | "subtitle" | "body" | "lineHeight", min: number, max: number, step = 0.05) => (
    <label className="block text-sm">
      {label}: <b>{d[k].toFixed(2)}</b>
      <input type="range" min={min} max={max} step={step} value={d[k]} onChange={(e) => set(k, Number(e.target.value))} className="w-full" />
    </label>
  );
  const page = edition?.pages[pageIndex];

  return (
    <div className="min-h-screen bg-background">
      <TopBar mode="admin" />
      <main className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 font-serif-bn lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-md border border-newsprint-rule bg-newsprint-paper p-4 lg:sticky lg:top-4 lg:self-start">
          <div className="flex items-center justify-between">
            <h1 className="font-display-bn text-2xl">পাতার ডিজাইন</h1>
            <Link to="/admin" className="text-xs underline">নিউজরুম</Link>
          </div>
          <p className="text-xs text-newsprint-muted">
            এই ডিজাইন সংস্করণের চার পাতাতেই একসঙ্গে বসে — শিরোনাম, উপশিরোনাম, সারাংশ ও ছবি। কোনো খবরে আলাদা মাপ দিলে সেটি এর উপর গুণ হিসেবে কাজ করে।
          </p>
          <div>
            <p className="mb-1 text-sm font-bold">তৈরি ডিজাইন</p>
            <div className="flex gap-1">
              {Object.entries(DESIGN_PRESETS).map(([k, p]) => (
                <button key={k} onClick={() => setD(p.design)} className={`flex-1 rounded px-2 py-1 text-sm ${d.preset === k ? "bg-newsprint-ink text-newsprint-paper" : "border border-newsprint-rule"}`}>
                  {p.name}
                </button>
              ))}
            </div>
            {d.preset === "custom" && <p className="mt-1 text-xs text-newsprint-accent">নিজস্ব ডিজাইন</p>}
          </div>
          {slider("প্রধান শিরোনামের মাপ", "headline", 0.8, 2.4)}
          {slider("খবরের শিরোনাম", "title", 0.7, 1.6)}
          {slider("উপশিরোনাম", "subtitle", 0.5, 1)}
          {slider("সারাংশ/প্রতিবেদন লেখা", "body", 0.6, 1, 0.02)}
          {slider("লাইনের ফাঁক", "lineHeight", 1.2, 1.9)}
          <label className="block text-sm">
            ছবির অনুপাত
            <select value={d.imageRatio} onChange={(e) => set("imageRatio", e.target.value as PageDesign["imageRatio"])} className="mt-1 w-full border border-newsprint-rule bg-background px-2 py-1">
              <option value="auto">মূল মাপ</option>
              <option value="16/9">১৬:৯ চওড়া</option>
              <option value="3/2">৩:২</option>
              <option value="4/3">৪:৩</option>
              <option value="1/1">বর্গ</option>
            </select>
          </label>
          <label className="block text-sm">
            শিরোনামের অক্ষর
            <select value={d.headlineFont} onChange={(e) => set("headlineFont", e.target.value as PageDesign["headlineFont"])} className="mt-1 w-full border border-newsprint-rule bg-background px-2 py-1">
              <option value="serif">সংবাদপত্র সেরিফ</option>
              <option value="display">মোটা ডিসপ্লে</option>
            </select>
          </label>
          <label className="block text-sm">
            বিভাগের লেবেল
            <select value={d.kicker} onChange={(e) => set("kicker", e.target.value as PageDesign["kicker"])} className="mt-1 w-full border border-newsprint-rule bg-background px-2 py-1">
              <option value="accent">লাল</option>
              <option value="ink">কালো</option>
              <option value="hidden">লুকানো</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={d.rules} onChange={(e) => set("rules", e.target.checked)} /> কলামের মাঝে রেখা
          </label>
          <button
            disabled={!edition || edition.status === "published"}
            onClick={async () => {
              if (!edition) return;
              setMsg("");
              try {
                await save({ data: { id: edition.id, design: d } });
                setMsg("সব পাতায় ডিজাইন সংরক্ষিত হয়েছে।");
              } catch (e) {
                setMsg(e instanceof Error ? e.message : "সংরক্ষণ হয়নি");
              }
            }}
            className="w-full bg-newsprint-accent px-3 py-2 text-newsprint-paper disabled:opacity-50"
          >
            চার পাতায় প্রয়োগ ও সংরক্ষণ
          </button>
          {msg && <p className="text-sm text-newsprint-accent">{msg}</p>}
        </aside>
        <section>
          {!loaded && <p>লোড হচ্ছে…</p>}
          {loaded && !edition && <p>কোনো খসড়া সংস্করণ নেই। আগে নিউজরুমে একটি সংস্করণ সংরক্ষণ করুন।</p>}
          {edition && (
            <>
              <div className="mb-3 flex flex-wrap gap-1">
                {edition.pages.map((p, i) => (
                  <button key={p.id} onClick={() => setPageIndex(i)} className={`rounded px-3 py-1 text-sm ${i === pageIndex ? "bg-newsprint-ink text-newsprint-paper" : "border border-newsprint-rule"}`}>
                    পৃষ্ঠা {p.no} · {p.title}
                  </button>
                ))}
              </div>
              {page && <NewspaperPage edition={{ ...edition, design: d }} page={page} />}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
