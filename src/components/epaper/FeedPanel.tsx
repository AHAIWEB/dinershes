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
export function FeedPanel({ onPick }: { onPick: (url: string, section: string) => void }) {
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
