import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LayoutGrid, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deleteAd,
  deleteArticle,
  getDashboard,
  listTeam,
  saveAd,
  setTeamRole,
} from "@/lib/dashboard.functions";
import { runEditorialWorkflow } from "@/lib/editor.functions";

type Dash = Awaited<ReturnType<typeof getDashboard>>;
type Team = Awaited<ReturnType<typeof listTeam>>;

const STATUS_BN: Record<string, string> = {
  draft: "খসড়া",
  review: "রিভিউ",
  approved: "অনুমোদিত",
  scheduled: "নির্ধারিত",
  published: "প্রকাশিত",
  source: "উৎস",
  ai_draft: "AI খসড়া",
  placed: "পাতায় বসানো",
};
const ROLE_BN = { admin: "অ্যাডমিন", editor: "সম্পাদক", designer: "ডিজাইনার" } as const;

const card = "rounded-md border border-newsprint-rule bg-newsprint-paper p-4";
const btn = "border border-newsprint-ink px-2 py-1 font-serif-bn text-xs disabled:opacity-40";

export function DashboardPanel({
  onUseAd,
  onOpenNewsroom,
  onOpenDesign,
}: {
  onUseAd: (ad: Dash["ads"][number]) => void;
  onOpenNewsroom: () => void;
  onOpenDesign: () => void;
}) {
  const fetchDash = useServerFn(getDashboard);
  const fetchTeam = useServerFn(listTeam);
  const workflow = useServerFn(runEditorialWorkflow);
  const removeArticle = useServerFn(deleteArticle);
  const storeAd = useServerFn(saveAd);
  const removeAd = useServerFn(deleteAd);
  const changeRole = useServerFn(setTeamRole);
  const [dash, setDash] = useState<Dash>();
  const [team, setTeam] = useState<Team>([]);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState("all");
  const [ad, setAd] = useState({ title: "", body: "", image_url: "", column_span: 2 });
  const [invite, setInvite] = useState({ email: "", role: "editor" as keyof typeof ROLE_BN });

  const refresh = useCallback(async () => {
    try {
      const d = await fetchDash();
      setDash(d);
      if (d.roles.includes("admin")) setTeam(await fetchTeam());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "তথ্য আনা যায়নি");
    }
  }, [fetchDash, fetchTeam]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = async (job: () => Promise<unknown>, ok: string) => {
    setMsg("");
    try {
      await job();
      setMsg(ok);
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "কাজটি হয়নি");
    }
  };

  if (!dash) return <p className="font-serif-bn text-sm">{msg || "ড্যাশবোর্ড লোড হচ্ছে…"}</p>;
  const isAdmin = dash.roles.includes("admin");
  const canApprove = isAdmin || dash.roles.includes("editor");
  const counts = ["draft", "review", "approved", "published"].map((s) => ({
    s,
    n: dash.editions.filter((e) => e.status === s).length,
  }));
  const articles = dash.articles.filter((a) => filter === "all" || a.status === filter);

  return (
    <div className="space-y-5">
      {msg && <p className="rounded bg-newsprint-tint px-3 py-2 font-serif-bn text-sm">{msg}</p>}
      <section className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-newsprint-ink pb-4">
        <div>
          <p className="font-serif-bn text-xs text-newsprint-accent">সম্পাদকীয় ডেস্ক</p>
          <h1 className="font-serif-bn text-2xl font-bold">আজকের সংস্করণ সাজান</h1>
          <p className="font-serif-bn text-sm text-newsprint-muted">খবরের লিংক দিন, পাতা ও কলাম বেছে বিন্যাস করুন।</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onOpenNewsroom} className="gap-2 bg-newsprint-accent font-serif-bn text-newsprint-paper hover:bg-newsprint-accent/90">
            <Newspaper size={16} /> খবর আনুন ও সাজান
          </Button>
          <Button variant="outline" onClick={onOpenDesign} className="gap-2 font-serif-bn">
            <LayoutGrid size={16} /> পৃষ্ঠা নকশা
          </Button>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {counts.map((c) => (
          <div key={c.s} className={card}>
            <p className="font-serif-bn text-xs text-newsprint-muted">{STATUS_BN[c.s]}</p>
            <p className="font-display-bn text-3xl">{c.n.toLocaleString("bn")}</p>
          </div>
        ))}
      </div>

      <section className={card}>
        <h2 className="font-serif-bn text-lg font-bold">সংস্করণ</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full font-serif-bn text-sm">
            <tbody>
              {dash.editions.map((e) => (
                <tr key={e.id} className="border-t border-newsprint-rule/60">
                  <td className="py-2 pr-2 font-bold">{e.edition_number}</td>
                  <td className="pr-2 text-xs">{e.date_bn}</td>
                  <td className="pr-2 text-xs">{STATUS_BN[e.status]}</td>
                  <td className="pr-2 text-xs">{e.edition_pages.length} পাতা</td>
                  <td className="flex flex-wrap justify-end gap-1 py-2">
                    {e.status === "review" && canApprove && (
                      <button className={btn} onClick={() => act(() => workflow({ data: { editionId: e.id, scope: "edition", action: "approve" } }), "অনুমোদিত হয়েছে")}>
                        অনুমোদন
                      </button>
                    )}
                    {e.status === "approved" && canApprove && (
                      <button className={btn} onClick={() => act(() => workflow({ data: { editionId: e.id, scope: "edition", action: "publish" } }), "প্রকাশিত হয়েছে")}>
                        প্রকাশ
                      </button>
                    )}
                    {e.status === "published" && (
                      <>
                        <Link to="/issue/$editionId" params={{ editionId: e.id }} className={btn}>দেখুন</Link>
                        <Link to="/print/$editionId" params={{ editionId: e.id }} className={btn}>মুদ্রণ ফাইল</Link>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif-bn text-lg font-bold">খবরের তালিকা</h2>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border border-newsprint-rule bg-background px-2 py-1 font-serif-bn text-xs">
            <option value="all">সব</option>
            <option value="ai_draft">AI খসড়া</option>
            <option value="approved">অনুমোদিত</option>
            <option value="placed">পাতায় বসানো</option>
          </select>
        </div>
        <ul className="mt-2 max-h-80 space-y-1 overflow-y-auto">
          {articles.map((a) => (
            <li key={a.id} className="flex items-center gap-2 border-t border-newsprint-rule/60 py-1.5">
              <span className="min-w-0 flex-1 truncate font-serif-bn text-sm">{a.title || "(শিরোনামহীন)"}</span>
              <span className="font-serif-bn text-xs text-newsprint-muted">{a.section} · {STATUS_BN[a.status]}</span>
              <button className={btn} onClick={() => act(() => removeArticle({ data: { id: a.id } }), "খবর মুছে ফেলা হয়েছে")}>মুছুন</button>
            </li>
          ))}
          {!articles.length && <li className="font-serif-bn text-xs text-newsprint-muted">কোনো খবর নেই।</li>}
        </ul>
      </section>

      <section className={card}>
        <h2 className="font-serif-bn text-lg font-bold">বিজ্ঞাপন</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
          <input placeholder="শিরোনাম" value={ad.title} onChange={(e) => setAd({ ...ad, title: e.target.value })} className="border border-newsprint-rule bg-background px-2 py-1 font-serif-bn text-xs" />
          <input placeholder="লেখা / যোগাযোগ" value={ad.body} onChange={(e) => setAd({ ...ad, body: e.target.value })} className="border border-newsprint-rule bg-background px-2 py-1 font-serif-bn text-xs" />
          <input placeholder="ছবির ঠিকানা (ঐচ্ছিক)" value={ad.image_url} onChange={(e) => setAd({ ...ad, image_url: e.target.value })} className="border border-newsprint-rule bg-background px-2 py-1 font-sans text-xs" />
          <select value={ad.column_span} onChange={(e) => setAd({ ...ad, column_span: Number(e.target.value) })} className="border border-newsprint-rule bg-background px-2 py-1 font-serif-bn text-xs">
            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} কলাম</option>)}
          </select>
          <button className={btn} disabled={!ad.title} onClick={() => act(async () => { await storeAd({ data: { ...ad, image_url: ad.image_url || null, active: true } }); setAd({ title: "", body: "", image_url: "", column_span: 2 }); }, "বিজ্ঞাপন যোগ হয়েছে")}>যোগ</button>
        </div>
        <ul className="mt-3 space-y-1">
          {dash.ads.map((a) => (
            <li key={a.id} className="flex items-center gap-2 border-t border-newsprint-rule/60 py-1.5">
              <span className="min-w-0 flex-1 truncate font-serif-bn text-sm">{a.title}</span>
              <span className="font-serif-bn text-xs">{a.column_span} কলাম</span>
              <button className={btn} onClick={() => onUseAd(a)}>পাতায় বসান</button>
              <button className={btn} onClick={() => act(() => removeAd({ data: { id: a.id } }), "বিজ্ঞাপন মুছে ফেলা হয়েছে")}>মুছুন</button>
            </li>
          ))}
        </ul>
      </section>

      {isAdmin && (
        <section className={card}>
          <h2 className="font-serif-bn text-lg font-bold">ব্যবহারকারী ও রোল</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <input placeholder="ইমেইল" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} className="min-w-0 flex-1 border border-newsprint-rule bg-background px-2 py-1 font-sans text-xs" />
            <select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as keyof typeof ROLE_BN })} className="border border-newsprint-rule bg-background px-2 py-1 font-serif-bn text-xs">
              {Object.entries(ROLE_BN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button className={btn} disabled={!invite.email} onClick={() => act(() => changeRole({ data: invite }), "রোল দেওয়া হয়েছে (নতুন হলে আমন্ত্রণ ইমেইল গেছে)")}>রোল দিন</button>
          </div>
          <ul className="mt-3 space-y-1">
            {team.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-2 border-t border-newsprint-rule/60 py-1.5">
                <span className="min-w-0 flex-1 truncate font-sans text-xs">{u.email}</span>
                {u.roles.length === 0 && <span className="font-serif-bn text-xs text-newsprint-muted">অনুমতি নেই</span>}
                {u.roles.map((r) => (
                  <button key={r} title="সরাতে চাপুন" className={btn} onClick={() => act(() => changeRole({ data: { email: u.email, role: r, remove: true } }), "রোল সরানো হয়েছে")}>
                    {ROLE_BN[r]} ✕
                  </button>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
