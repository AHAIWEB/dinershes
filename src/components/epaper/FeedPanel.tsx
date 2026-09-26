import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { addFeed, listFeeds, readFeed } from "@/lib/dashboard.functions";

type Feed = { id: string; url: string; name: string; region: string; active: boolean; last_status: string };
type Item = { title: string; link: string; summary: string; image?: string; published?: string };

const REGION_SECTION: Record<string, string> = {
  জাতীয়: "দেশ",
  আন্তর্জাতিক: "বিশ্ব",
  ভারত: "বিশ্ব",
};

/** Pick a saved Bangla news feed, browse its latest items and send one to the AI newsroom. */
export function FeedPanel({
  onPick,
  pages = [],
  onAutoPlace,
}: {
  onPick: (url: string, section: string) => void;
  pages?: { no: number; title: string; section?: string }[];
  onAutoPlace?: (items: Item[], pageIndex: number, replace: boolean, section: string) => void;
}) {
  const load = useServerFn(listFeeds);
  const read = useServerFn(readFeed);
  const add = useServerFn(addFeed);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [region, setRegion] = useState("জাতীয়");
  const [feedId, setFeedId] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [autoPage, setAutoPage] = useState(0);
  const [autoCount, setAutoCount] = useState(6);
  const [replace, setReplace] = useState(true);

  /** Reads every active feed of the chosen region and lays the latest N stories onto the chosen page. */
  const autoFill = async () => {
    if (!onAutoPlace) return;
    setBusy(true);
    setMsg("");
    const active = feeds.filter((f) => f.region === region && f.active);
    const results = await Promise.all(
      active.map((f) => read({ data: { id: f.id } }).catch(() => ({ items: [] as Item[], error: "" }))),
    );
    // Interleave feeds so one site doesn't fill the whole page.
    const seen = new Set<string>();
    const picked: Item[] = [];
    for (let i = 0; picked.length < autoCount && i < 25; i += 1) {
      for (const r of results) {
        const it = r.items[i];
        if (it && !seen.has(it.link) && picked.length < autoCount) {
          seen.add(it.link);
          picked.push(it);
        }
      }
    }
    setBusy(false);
    if (!picked.length) return setMsg("সক্রিয় ফিড থেকে কোনো খবর পাওয়া যায়নি।");
    onAutoPlace(picked, autoPage, replace, pages[autoPage]?.section ?? REGION_SECTION[region] ?? "দেশ");
    void refresh();
  };

  const refresh = () => load().then(setFeeds).catch((e) => setMsg(String(e.message ?? e)));
  useEffect(() => {
    void refresh();
  }, []);

  const regions = useMemo(() => [...new Set(feeds.map((f) => f.region))], [feeds]);
  const visible = feeds.filter((f) => f.region === region);

  const open = async (id: string) => {
    setFeedId(id);
    setBusy(true);
    setMsg("");
    setItems([]);
    const res = await read({ data: { id } }).catch((e) => ({ items: [], error: String(e.message) }));
    setItems(res.items);
    if (res.error) setMsg(res.error);
    setBusy(false);
    void refresh();
  };

  return (
    <section className="mb-5 rounded-md border border-newsprint-rule bg-newsprint-paper p-4">
      <h2 className="font-serif-bn text-lg font-bold">সংবাদ সাইটের ফিড থেকে খবর</h2>
      <div className="mt-2 flex flex-wrap gap-1">
        {regions.map((r) => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            className={`rounded px-2 py-1 font-serif-bn text-xs ${r === region ? "bg-newsprint-ink text-newsprint-paper" : "border border-newsprint-rule"}`}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {visible.map((f) => (
          <button
            key={f.id}
            onClick={() => open(f.id)}
            title={f.url}
            className={`rounded border px-2 py-1 font-serif-bn text-xs ${f.id === feedId ? "border-newsprint-accent text-newsprint-accent" : "border-newsprint-rule"}`}
          >
            {f.last_status === "error" ? "⚠ " : f.last_status === "ok" ? "● " : ""}
            {f.name}
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="নতুন ফিডের ঠিকানা (https://…/feed)"
          className="min-w-0 flex-1 border border-newsprint-rule bg-background px-2 py-1 font-sans text-xs"
        />
        <button
          onClick={async () => {
            try {
              await add({ data: { url: newUrl, name: new URL(newUrl).hostname.replace(/^www\./, ""), region } });
              setNewUrl("");
              void refresh();
            } catch (e) {
              setMsg(e instanceof Error ? e.message : "যোগ করা যায়নি");
            }
          }}
          className="border border-newsprint-ink px-2 py-1 font-serif-bn text-xs"
        >
          ফিড যোগ
        </button>
      </div>
      {onAutoPlace && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-newsprint-rule pt-3 font-serif-bn text-xs">
          <span className="font-bold">স্বয়ংক্রিয় বিন্যাস:</span>
          <select aria-label="কোন পাতায়" value={autoPage} onChange={(e) => setAutoPage(Number(e.target.value))} className="border border-newsprint-rule bg-background px-2 py-1">
            {pages.map((p, i) => <option key={i} value={i}>পৃষ্ঠা {p.no} · {p.title}</option>)}
          </select>
          <label className="flex items-center gap-1">
            খবর সংখ্যা
            <input type="number" min={1} max={20} value={autoCount} onChange={(e) => setAutoCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} className="w-14 border border-newsprint-rule bg-background px-1 py-1" />
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
            পুরনো খবর সরিয়ে নতুন
          </label>
          <button disabled={busy} onClick={autoFill} className="bg-newsprint-ink px-3 py-1 text-newsprint-paper disabled:opacity-50">
            সক্রিয় ফিড থেকে পাতায় বসান
          </button>
        </div>
      )}
      {busy && <p className="mt-3 font-serif-bn text-xs">ফিড পড়া হচ্ছে…</p>}
      {msg && <p className="mt-3 font-serif-bn text-xs text-newsprint-accent">{msg}</p>}
      <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
        {items.map((it) => (
          <li key={it.link} className="flex gap-3 border-b border-newsprint-rule/60 pb-2">
            {it.image && <img src={it.image} alt="" className="h-14 w-20 shrink-0 object-cover" />}
            <div className="min-w-0 flex-1">
              <p className="font-serif-bn text-sm font-bold leading-snug">{it.title}</p>
              <p className="line-clamp-2 font-serif-bn text-xs text-newsprint-muted">{it.summary}</p>
            </div>
            <button
              onClick={() => onPick(it.link, REGION_SECTION[region] ?? "দেশ")}
              className="shrink-0 self-center bg-newsprint-accent px-2 py-1 font-serif-bn text-xs text-newsprint-paper"
            >
              নিউজরুমে নিন
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
