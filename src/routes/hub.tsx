import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AuthGate } from "@/components/epaper/AuthGate";
import { TopBar } from "@/components/epaper/TopBar";
import {
  addFeed,
  deleteFeed,
  deleteSaved,
  listFeeds,
  listSaved,
  readFeed,
  saveStory,
  searchFeeds,
  updateFeed,
} from "@/lib/dashboard.functions";

export const Route = createFileRoute("/hub")({
  head: () => ({
    meta: [
      { title: "স্ক্র্যাপার হাব · দিনের শেষ খবর" },
      { name: "description", content: "ক্যাটাগরি অনুযায়ী বাংলা সংবাদ সাইট ও ফিড সংরক্ষণ, খবর সার্চ ও সংরক্ষণ।" },
      { property: "og:title", content: "স্ক্র্যাপার হাব · দিনের শেষ খবর" },
      { property: "og:description", content: "ক্যাটাগরি অনুযায়ী সংবাদ উৎস ও সংরক্ষিত খবর।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AuthGate>
      <Hub />
    </AuthGate>
  ),
});

const CATEGORIES = ["জাতীয়", "আন্তর্জাতিক", "ভারত", "খেলা", "বিনোদন", "অর্থনীতি", "প্রযুক্তি", "আঞ্চলিক"];

type Feed = { id: string; url: string; name: string; region: string; active: boolean; last_status: string; kind: string };
type Found = { title: string; link: string; summary: string; image?: string; feedId: string; feedName: string };
type Saved = { id: string; title: string; link: string; summary: string; image_url: string | null; category: string };

const input = "border border-newsprint-rule bg-background px-2 py-1 font-serif-bn text-sm";

function Hub() {
  const load = useServerFn(listFeeds);
  const add = useServerFn(addFeed);
  const upd = useServerFn(updateFeed);
  const del = useServerFn(deleteFeed);
  const test = useServerFn(readFeed);
  const search = useServerFn(searchFeeds);
  const loadSaved = useServerFn(listSaved);
  const save = useServerFn(saveStory);
  const unsave = useServerFn(deleteSaved);

  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [cat, setCat] = useState("জাতীয়");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"feed" | "site">("feed");
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Found[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () => Promise.all([load().then(setFeeds), loadSaved().then(setSaved)]).catch((e) => setMsg(String(e.message ?? e)));
  useEffect(() => {
    void refresh();
  }, []);

  const cats = useMemo(() => [...new Set([...CATEGORIES, ...feeds.map((f) => f.region)])], [feeds]);
  const visible = feeds.filter((f) => f.region === cat);
  const savedLinks = new Set(saved.map((s) => s.link));
  const run = async (fn: () => Promise<unknown>) => {
    setMsg("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "কাজটি হয়নি");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar mode="admin" />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 font-serif-bn">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-display-bn text-3xl">স্ক্র্যাপার হাব</h1>
          <div className="flex gap-2 text-sm">
            <Link to="/admin" className="border border-newsprint-ink px-3 py-1">নিউজরুমে ফিরুন</Link>
            <Link to="/design" className="border border-newsprint-ink px-3 py-1">পাতার ডিজাইন</Link>
          </div>
        </div>
        {msg && <p className="text-sm text-newsprint-accent">{msg}</p>}

        <div className="flex flex-wrap gap-1">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`rounded px-3 py-1 text-sm ${c === cat ? "bg-newsprint-ink text-newsprint-paper" : "border border-newsprint-rule"}`}>
              {c} ({feeds.filter((f) => f.region === c).length})
            </button>
          ))}
        </div>

        <section className="rounded-md border border-newsprint-rule bg-newsprint-paper p-4">
          <h2 className="text-lg font-bold">“{cat}” ক্যাটাগরির লিংক</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/feed" className={`${input} min-w-0 flex-1`} />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="নাম" className={`${input} w-40`} />
            <select value={kind} onChange={(e) => setKind(e.target.value as "feed" | "site")} className={input}>
              <option value="feed">ফিড (RSS)</option>
              <option value="site">সাইট লিংক</option>
            </select>
            <button
              onClick={() =>
                run(async () => {
                  const host = new URL(url).hostname.replace(/^www\./, "");
                  await add({ data: { url, name: name || host, region: cat, kind } });
                  setUrl("");
                  setName("");
                })
              }
              className="bg-newsprint-ink px-3 py-1 text-sm text-newsprint-paper"
            >
              সংরক্ষণ
            </button>
          </div>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {visible.map((f) => (
                <tr key={f.id} className="border-b border-newsprint-rule/60">
                  <td className="py-1 pr-2">
                    <span className={f.last_status === "ok" ? "text-green-700" : f.last_status === "error" ? "text-newsprint-accent" : "text-newsprint-muted"}>●</span>{" "}
                    <input defaultValue={f.name} onBlur={(e) => e.target.value !== f.name && run(() => upd({ data: { id: f.id, name: e.target.value } }))} className="w-36 bg-transparent" />
                  </td>
                  <td className="max-w-xs truncate font-sans text-xs text-newsprint-muted" title={f.url}>{f.kind === "site" ? "সাইট · " : ""}{f.url}</td>
                  <td>
                    <select value={f.region} onChange={(e) => run(() => upd({ data: { id: f.id, region: e.target.value } }))} className="bg-transparent text-xs">
                      {cats.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <label className="mr-2 text-xs">
                      <input type="checkbox" checked={f.active} onChange={(e) => run(() => upd({ data: { id: f.id, active: e.target.checked } }))} /> সক্রিয়
                    </label>
                    {f.kind !== "site" && (
                      <button onClick={() => run(async () => { const r = await test({ data: { id: f.id } }); setMsg(r.error ? `${f.name}: ${r.error}` : `${f.name}: ${r.items.length}টি খবর পাওয়া গেছে`); })} className="mr-2 text-xs underline">
                        পরীক্ষা
                      </button>
                    )}
                    <button onClick={() => confirm("মুছে ফেলবেন?") && run(() => del({ data: { id: f.id } }))} className="text-xs text-newsprint-accent">মুছুন</button>
                  </td>
                </tr>
              ))}
              {!visible.length && <tr><td className="py-2 text-newsprint-muted">এই ক্যাটাগরিতে এখনো লিংক নেই।</td></tr>}
            </tbody>
          </table>
        </section>

        <section className="rounded-md border border-newsprint-rule bg-newsprint-paper p-4">
          <h2 className="text-lg font-bold">সক্রিয় ফিডে খবর খুঁজুন</h2>
          <div className="mt-2 flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="শব্দ লিখুন (খালি রাখলে সব সর্বশেষ খবর)" className={`${input} flex-1`} />
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setMsg("");
                try {
                  const r = await search({ data: { region: cat, query: q } });
                  setFound(r);
                  if (!r.length) setMsg("কোনো খবর মেলেনি।");
                } catch (e) {
                  setMsg(e instanceof Error ? e.message : "খোঁজা যায়নি");
                }
                setBusy(false);
                void refresh();
              }}
              className="bg-newsprint-accent px-3 py-1 text-sm text-newsprint-paper disabled:opacity-50"
            >
              {busy ? "খোঁজা হচ্ছে…" : "সার্চ"}
            </button>
          </div>
          <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto">
            {found.map((it) => (
              <li key={it.link} className="flex gap-3 border-b border-newsprint-rule/60 pb-2">
                {it.image && <img src={it.image} alt="" className="h-14 w-20 shrink-0 object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{it.title}</p>
                  <p className="line-clamp-2 text-xs text-newsprint-muted">{it.feedName} · {it.summary}</p>
                </div>
                <button
                  disabled={savedLinks.has(it.link)}
                  onClick={() => run(() => save({ data: { title: it.title, link: it.link, summary: it.summary, category: cat, feedId: it.feedId, ...(it.image ? { image: it.image } : {}) } }))}
                  className="shrink-0 self-center border border-newsprint-ink px-2 py-1 text-xs disabled:opacity-40"
                >
                  {savedLinks.has(it.link) ? "সংরক্ষিত" : "সংরক্ষণ"}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-md border border-newsprint-rule bg-newsprint-paper p-4">
          <h2 className="text-lg font-bold">সংরক্ষিত খবর ({saved.filter((s) => s.category === cat).length})</h2>
          <p className="text-xs text-newsprint-muted">নিউজরুমে “সংরক্ষিত খবর থেকে” বেছে এগুলো পাতায় বসাতে পারবেন।</p>
          <ul className="mt-3 space-y-2">
            {saved.filter((s) => s.category === cat).map((s) => (
              <li key={s.id} className="flex items-center gap-3 border-b border-newsprint-rule/60 pb-2 text-sm">
                <a href={s.link} target="_blank" rel="noreferrer" className="min-w-0 flex-1 font-bold hover:underline">{s.title}</a>
                <button onClick={() => run(() => unsave({ data: { id: s.id } }))} className="text-xs text-newsprint-accent">সরান</button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
