import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AuthGate } from "@/components/epaper/AuthGate";
import { NewsroomPanel } from "@/components/epaper/NewsroomPanel";
import { ShareCardStudio } from "@/components/epaper/ShareCardStudio";
import { supabase } from "@/integrations/supabase/client";
import { COLUMN_WIDTHS } from "@/lib/epaper-data";
import { loadEditorialEdition, saveEditorialEdition } from "@/lib/editor.functions";
import { TopBar } from "@/components/epaper/TopBar";
import { NewspaperPage } from "@/components/epaper/NewspaperPage";
import {
  blockPalette,
  initialEdition,
  newBlock,
  SECTIONS,
  type Block,
  type BlockType,
  type Edition,
} from "@/lib/epaper-data";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "পৃষ্ঠা ডিজাইন · দিনের শেষ খবর" },
      {
        name: "description",
        content:
          "দিনের শেষ খবর ই-পেপারের সম্পাদকীয় পৃষ্ঠা, সংবাদ, খসড়া ও প্রকাশনা পরিচালনা করুন।",
      },
      { property: "og:title", content: "পৃষ্ঠা ডিজাইন · দিনের শেষ খবর" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        property: "og:description",
        content: "ই-পেপারের প্রতিটি সংবাদ, কলাম ও পৃষ্ঠার বিন্যাস নিয়ন্ত্রণ করুন।",
      },
    ],
  }),
  component: () => <AuthGate><AdminStudio /></AuthGate>,
});

const NAV = [
  { label: "পৃষ্ঠা ডিজাইন", icon: "▦" },
  { label: "AI নিউজরুম", icon: "≡" },
  { label: "শেয়ার কার্ড", icon: "▤" },
];

function AdminStudio() {
  const loadSaved = useServerFn(loadEditorialEdition);
  const saveEdition = useServerFn(saveEditorialEdition);
   const [edition, setEdition] = useState<Edition>(() => ({ ...initialEdition, number: "১১" }));
   const [loaded, setLoaded] = useState(false);
  const [savedId, setSavedId] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>("b2");
  const [tab, setTab] = useState<"বিষয়বস্তু" | "বিন্যাস" | "সেটিংস">("বিষয়বস্তু");
  const [zoom, setZoom] = useState(72);
  const [nav, setNav] = useState("পৃষ্ঠা ডিজাইন");
  const [dragging, setDragging] = useState<
    { kind: "new"; type: BlockType } | { kind: "move"; id: string } | null
  >(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    loadSaved().then((saved) => {
       if (!mounted) return;
       if (!saved) { setLoaded(true); return; }
      setSavedId(saved.edition.id);
      setScheduledFor(saved.edition.scheduled_for ?? "");
      setEdition({ id: saved.edition.id, number: saved.edition.edition_number,
        dateBn: saved.edition.date_bn, hijri: saved.edition.hijri_date,
        status: saved.edition.status as Edition["status"],
        pages: saved.pages.map((p) => ({ id: p.id, no: p.page_number, title: p.title, section: p.section, columns: p.columns as Block[][] })),
      });
       setLoaded(true);
     }).catch((error) => { if (mounted) notify(error instanceof Error ? error.message : "সংরক্ষিত সংস্করণ খোলা যায়নি।"); });
    return () => { mounted = false; };
  }, [loadSaved]);

  const page = edition.pages[pageIndex] ?? edition.pages[0];
  if (!page) return null;
  const selected = page.columns.flat().find((b) => b.id === selectedId) ?? null;

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const persist = async (status: Edition["status"]) => {
     if (saving || !loaded) return;
    setSaving(true);
    try {
      const result = await saveEdition({ data: { ...(savedId ? { editionId: savedId } : {}), number: edition.number,
        dateBn: edition.dateBn, hijri: edition.hijri, status,
        ...(status === "scheduled" && scheduledFor ? { scheduledFor: new Date(scheduledFor).toISOString() } : {}),
        pages: edition.pages.map((p) => ({ title: p.title, section: p.section, columns: p.columns })),
      } });
      setSavedId(result.id);
      setEdition((prev) => ({ ...prev, status }));
      notify(status === "published" ? "সংস্করণ প্রকাশিত হয়েছে" : "সংস্করণ সংরক্ষিত হয়েছে");
    } catch (error) { notify(error instanceof Error ? error.message : "সংরক্ষণ করা যায়নি।"); }
    finally { setSaving(false); }
  };

  const updatePage = (fn: (cols: Block[][]) => Block[][]) =>
    setEdition((prev) => ({
      ...prev,
      pages: prev.pages.map((p, i) => (i === pageIndex ? { ...p, columns: fn(p.columns) } : p)),
    }));

  const patchSelected = (patch: Partial<Block>) =>
    updatePage((cols) =>
      cols.map((c) => c.map((b) => (b.id === selectedId ? { ...b, ...patch } : b))),
    );

  const handleDrop = (columnIndex: number) => {
    if (!dragging) return;
    if (dragging.kind === "new") {
      const block = newBlock(dragging.type);
      block.section = page.section;
      updatePage((cols) => cols.map((c, i) => (i === columnIndex ? [...c, block] : c)));
      setSelectedId(block.id);
      notify("অংশ যোগ হয়েছে");
    } else {
      const moved = page.columns.flat().find((b) => b.id === dragging.id);
      if (!moved) return;
      updatePage((cols) =>
        cols.map((c, i) =>
          i === columnIndex
            ? [...c.filter((b) => b.id !== moved.id), moved]
            : c.filter((b) => b.id !== moved.id),
        ),
      );
      notify("অংশ সরানো হয়েছে");
    }
    setDragging(null);
  };

  const removeSelected = () => {
    updatePage((cols) => cols.map((c) => c.filter((b) => b.id !== selectedId)));
    setSelectedId(null);
    notify("অংশ মুছে ফেলা হয়েছে");
  };

  const addPage = () => {
    if (edition.pages.length >= 4) return notify("সংস্করণে চারটি পৃষ্ঠা থাকবে।");
    setEdition((prev) => ({
      ...prev,
      pages: [
        ...prev.pages,
        {
          id: `p${prev.pages.length + 1}`,
          no: prev.pages.length + 1,
          title: "নতুন পৃষ্ঠা",
          section: "দেশ",
          columns: [[], [], [], [], [], []],
        },
      ],
    }));
    setPageIndex(edition.pages.length);
  };

  const spacingField = (
    key: "margin" | "padding",
    side: "top" | "right" | "bottom" | "left",
  ) => (
    <label className="block">
      <input
        type="number"
        value={selected?.[key]?.[side] ?? 0}
        onChange={(e) =>
          patchSelected({
            [key]: { ...(selected?.[key] ?? { top: 0, right: 0, bottom: 0, left: 0 }), [side]: Number(e.target.value) },
          } as Partial<Block>)
        }
        className="w-full rounded border border-newsprint-rule bg-newsprint-paper px-2 py-1 text-xs"
      />
      <span className="mt-1 block text-center text-[0.6rem] capitalize text-newsprint-muted">
        {side}
      </span>
    </label>
  );

  return (
    <div className="min-h-screen bg-background">
      <TopBar mode="admin" />

      <div className="no-print border-b border-newsprint-rule bg-newsprint-paper">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-2 px-4 py-2">
          <span className="rounded-full bg-newsprint-tint px-3 py-1 font-sans text-xs text-newsprint-accent">
             {edition.status === "draft" ? "খসড়া" : edition.status === "review" ? "যাচাই" : edition.status === "scheduled" ? "নির্ধারিত" : "প্রকাশিত"}
          </span>
          <span className="font-serif-bn text-xs text-newsprint-muted">{edition.dateBn}</span>
          <div className="ml-auto flex flex-wrap gap-2">
            {[
               { l: "↓ খসড়া সংরক্ষণ", s: "draft" as const },
               { l: "◉ যাচাইয়ের জন্য", s: "review" as const },
               { l: "◔ সময় নির্ধারণ", s: "scheduled" as const },
            ].map((b) => (
              <button
                key={b.l}
                 onClick={() => persist(b.s)}
                  disabled={saving || !loaded || edition.status === "published"}
                className="rounded-md border border-newsprint-rule px-3 py-1.5 font-sans text-xs"
              >
                {b.l}
              </button>
            ))}
             <input aria-label="প্রকাশের সময়" type="datetime-local" value={scheduledFor ? scheduledFor.slice(0,16) : ""} onChange={(e) => setScheduledFor(e.target.value)} className="border border-newsprint-rule bg-newsprint-paper px-2 font-serif-bn text-xs" />
             <button
               onClick={() => persist("published")}
                disabled={saving || !loaded || edition.status === "published"}
              className="rounded-md bg-newsprint-accent px-3 py-1.5 font-sans text-xs text-newsprint-paper"
            >
               ↗ প্রকাশ করুন
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1500px] flex-col lg:flex-row">
        <aside className="no-print w-full shrink-0 border-b border-newsprint-rule bg-newsprint-ink px-3 py-4 text-newsprint-paper lg:w-56 lg:border-b-0 lg:border-r">
           <p className="px-2 font-serif-bn text-xs opacity-60">সম্পাদকীয় কক্ষ</p>
          <nav className="mt-3 flex gap-1 overflow-x-auto lg:flex-col">
            {NAV.map((n) => (
              <button
                key={n.label}
                onClick={() => setNav(n.label)}
                className={`flex shrink-0 items-center gap-2 rounded px-3 py-2 font-sans text-xs ${
                  nav === n.label
                    ? "border-l-2 border-newsprint-accent bg-newsprint-paper/10"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <span>{n.icon}</span>
                <span>{n.label}</span>
              </button>
            ))}
          </nav>
          <div className="mt-6 hidden px-2 font-sans text-[0.6rem] leading-relaxed opacity-60 lg:block">
            <p>দিনের শেষ খবর · নিউজরুম</p>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="mt-3 underline">প্রস্থান</button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-5">
          {nav === "AI নিউজরুম" ? <NewsroomPanel onPlace={(draft) => { const block = newBlock("article"); block.label = draft.title; block.body = `${draft.subtitle}\n${draft.summary}\n${draft.body}`; block.section = draft.section; block.columnSpan = 2; updatePage((cols) => cols.map((col, index) => index === 0 ? [...col, block] : col)); setSelectedId(block.id); setNav("পৃষ্ঠা ডিজাইন"); notify("অনুমোদিত সংবাদ পাতায় বসেছে"); }} /> : nav === "শেয়ার কার্ড" ? <ShareCardStudio headline={page.columns.flat().find((b) => b.type === "headline")?.label ?? "দিনের শেষ খবর"} section={page.section} date={edition.dateBn} /> : <>
          <div className="no-print grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:justify-between">
            <div className="min-w-0">
              <p className="font-sans text-[0.65rem] text-newsprint-muted">
                 সংস্করণ {edition.number} · {edition.dateBn} · {edition.pages.length} পৃষ্ঠা
              </p>
               <label className="mt-2 block font-serif-bn text-xs">সংস্করণ নম্বর <input aria-label="সংস্করণ নম্বর" value={edition.number} onChange={(e) => setEdition((prev) => ({ ...prev, number: e.target.value }))} className="ml-2 w-16 border border-newsprint-rule bg-newsprint-paper px-2 py-1" /></label>
               <h1 className="font-serif-bn text-2xl font-bold">পৃষ্ঠা ডিজাইন</h1>
              <p className="font-serif-bn text-xs text-newsprint-muted">
                 ছয় কলামের ছাপার পাতায় প্রতিটি অংশ সাজান।
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                onClick={() => window.print()}
                className="rounded-md border border-newsprint-rule px-3 py-2 font-sans text-xs"
              >
                 ↓ পিডিএফ হিসেবে সংরক্ষণ
              </button>
               <Link
                 to="/issue"
                className="rounded-md bg-newsprint-ink px-3 py-2 font-sans text-xs text-newsprint-paper"
              >
                 প্রকাশিত সংস্করণ ↗
              </Link>
            </div>
          </div>

          <div className="mt-4 border border-newsprint-rule bg-newsprint-tint">
            <div className="no-print flex flex-wrap items-center gap-2 border-b border-newsprint-rule px-3 py-2">
              <span className="font-serif-bn text-sm font-bold">
                 পৃষ্ঠা {page.no} · {page.title}
              </span>
              <span className="font-sans text-[0.65rem] text-newsprint-muted">
                 অংশ টেনে কলামে রাখুন · সম্পাদনা করতে নির্বাচন করুন
              </span>
              <div className="ml-auto flex items-center gap-2 font-sans text-xs">
                <button onClick={() => setZoom((z) => Math.max(40, z - 8))}>−</button>
                <span>{zoom}%</span>
                <button onClick={() => setZoom((z) => Math.min(110, z + 8))}>+</button>
              </div>
            </div>

            <div className="grid gap-3 p-3 lg:grid-cols-[170px_minmax(0,1fr)_250px]">
              <div className="no-print rounded bg-newsprint-ink p-3 text-newsprint-paper">
                 <p className="font-serif-bn text-xs font-semibold">পাতার অংশ</p>
                <p className="mt-1 font-serif-bn text-[0.62rem] opacity-70">
                   অংশ টেনে পাতার যেকোনো কলামে ছেড়ে দিন।
                </p>
                <div className="mt-3 space-y-2">
                  {blockPalette.map((b) => (
                    <div
                      key={b.type}
                      draggable
                      onDragStart={() => setDragging({ kind: "new", type: b.type })}
                      className="cursor-grab rounded border border-newsprint-paper/20 bg-newsprint-paper/5 px-2 py-2 text-center active:cursor-grabbing"
                    >
                      <p className="font-sans text-xs font-semibold">{b.name}</p>
                      <p className="font-serif-bn text-[0.6rem] opacity-70">{b.hint}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                 <div
                   style={{ zoom: zoom / 100 }}
                  className="origin-top-left"
                >

                  <NewspaperPage
                    edition={edition}
                    page={page}
                    editable
                    selectedId={selectedId}
                    onSelect={(b) => setSelectedId(b.id)}
                    onDropBlock={handleDrop}
                    onDragStartBlock={(id) => setDragging({ kind: "move", id })}
                  />
                </div>
              </div>

              <div className="no-print rounded border border-newsprint-rule bg-newsprint-paper p-3">
                 <p className="font-serif-bn text-sm font-semibold">অংশের সেটিংস</p>
                <p className="font-serif-bn text-[0.62rem] text-newsprint-muted">
                   {selected ? `${selected.label} · ${selected.section}` : "একটি অংশ নির্বাচন করুন"}
                </p>

                {selected && (
                  <>
                    <div className="mt-3 flex border-b border-newsprint-rule">
                       {(["বিষয়বস্তু", "বিন্যাস", "সেটিংস"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTab(t)}
                          className={`px-2 py-1.5 font-sans text-xs ${
                            tab === t
                              ? "border-b-2 border-newsprint-accent font-semibold"
                              : "text-newsprint-muted"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 space-y-3 font-sans text-[0.68rem]">
                       {tab === "বিষয়বস্তু" && (
                        <>
                           <Field label="শিরোনাম">
                            <input
                              value={selected.label}
                              onChange={(e) => patchSelected({ label: e.target.value })}
                              className={inputCls}
                            />
                          </Field>
                           <Field label="বিভাগ">
                            <select
                              value={selected.section}
                              onChange={(e) => patchSelected({ section: e.target.value })}
                              className={inputCls}
                            >
                              {SECTIONS.map((s) => (
                                <option key={s}>{s}</option>
                              ))}
                            </select>
                          </Field>
                           <Field label="সারাংশ / ক্যাপশন">
                            <textarea
                              rows={4}
                              value={selected.body ?? selected.credit ?? ""}
                              onChange={(e) =>
                                patchSelected(
                                  selected.type === "image" || selected.type === "quote"
                                    ? { credit: e.target.value }
                                    : { body: e.target.value },
                                )
                              }
                              className={inputCls}
                            />
                          </Field>
                          {selected.type === "image" && (
                             <Field label="ছবির ঠিকানা">
                              <input
                                value={selected.imageSrc ?? ""}
                                onChange={(e) => patchSelected({ imageSrc: e.target.value })}
                                className={inputCls}
                              />
                            </Field>
                          )}
                        </>
                      )}

                       {tab === "বিন্যাস" && (
                        <>
                           <Field label={`কলামের বিস্তার · ${selected.columnSpan ?? 1} কলাম · ${COLUMN_WIDTHS[(selected.columnSpan ?? 1) - 1]} ইঞ্চি`}>
                             <select value={selected.columnSpan ?? 1} onChange={(e) => patchSelected({ columnSpan: Number(e.target.value) })} className={inputCls}>
                               {COLUMN_WIDTHS.map((width, index) => <option key={index} value={index + 1}>{index + 1} কলাম · {width.toFixed(3)}″</option>)}
                             </select>
                           </Field>
                          {selected.type === "image" && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                 <Field label="প্রস্থ (পিক্সেল)">
                                  <input
                                    type="number"
                                    value={selected.imageWidth ?? 320}
                                    onChange={(e) =>
                                      patchSelected({ imageWidth: Number(e.target.value) })
                                    }
                                    className={inputCls}
                                  />
                                </Field>
                                 <Field label="উচ্চতা (পিক্সেল)">
                                  <input
                                    type="number"
                                    value={selected.imageHeight ?? 240}
                                    onChange={(e) =>
                                      patchSelected({ imageHeight: Number(e.target.value) })
                                    }
                                    className={inputCls}
                                  />
                                </Field>
                              </div>
                               <Field label="ছবির ধরন">
                                <div className="flex rounded border border-newsprint-rule">
                                  {(["cover", "contain", "fill"] as const).map((f) => (
                                    <button
                                      key={f}
                                      onClick={() => patchSelected({ fit: f })}
                                      className={`flex-1 px-2 py-1 capitalize ${
                                        selected.fit === f
                                          ? "bg-newsprint-ink text-newsprint-paper"
                                          : ""
                                      }`}
                                    >
                                       {{ cover: "ভরে", contain: "সম্পূর্ণ", fill: "প্রসারিত" }[f]}
                                    </button>
                                  ))}
                                </div>
                              </Field>
                               <Field label={`কোণ · ${selected.radius ?? 0} পিক্সেল`}>
                                <input
                                  type="range"
                                  min={0}
                                  max={24}
                                  value={selected.radius ?? 0}
                                  onChange={(e) => patchSelected({ radius: Number(e.target.value) })}
                                  className="w-full"
                                />
                              </Field>
                            </>
                          )}
                           <Field label={`অক্ষরের মাপ · ${(selected.fontScale ?? 1).toFixed(2)}×`}>
                            <input
                              type="range"
                              min={0.7}
                              max={1.8}
                              step={0.05}
                              value={selected.fontScale ?? 1}
                              onChange={(e) => patchSelected({ fontScale: Number(e.target.value) })}
                              className="w-full"
                            />
                          </Field>
                           <Field label="লেখার অবস্থান">
                            <div className="flex rounded border border-newsprint-rule">
                              {(["left", "center", "right"] as const).map((a) => (
                                <button
                                  key={a}
                                  onClick={() => patchSelected({ align: a })}
                                  className={`flex-1 px-2 py-1 capitalize ${
                                    selected.align === a ? "bg-newsprint-ink text-newsprint-paper" : ""
                                  }`}
                                >
                                   {{ left: "বামে", center: "মাঝে", right: "ডানে" }[a]}
                                </button>
                              ))}
                            </div>
                          </Field>
                           <Field label="বাইরের ফাঁক">
                            <div className="grid grid-cols-4 gap-1">
                              {(["top", "right", "bottom", "left"] as const).map((s) => (
                                <div key={s}>{spacingField("margin", s)}</div>
                              ))}
                            </div>
                          </Field>
                           <Field label="ভেতরের ফাঁক">
                            <div className="grid grid-cols-4 gap-1">
                              {(["top", "right", "bottom", "left"] as const).map((s) => (
                                <div key={s}>{spacingField("padding", s)}</div>
                              ))}
                            </div>
                          </Field>
                          {selected.type === "ad" && (
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={!!selected.invert}
                                onChange={(e) => patchSelected({ invert: e.target.checked })}
                              />
                               গাঢ় বিজ্ঞাপন
                            </label>
                          )}
                        </>
                      )}

                       {tab === "সেটিংস" && (
                        <>
                          <p className="font-serif-bn text-newsprint-muted">
                             অংশ নম্বর: {selected.id} · ধরন: {blockPalette.find((item) => item.type === selected.type)?.name}
                          </p>
                           <Field label="পৃষ্ঠার শিরোনাম">
                            <input
                              value={page.title}
                              onChange={(e) =>
                                setEdition((prev) => ({
                                  ...prev,
                                  pages: prev.pages.map((p, i) =>
                                    i === pageIndex ? { ...p, title: e.target.value } : p,
                                  ),
                                }))
                              }
                              className={inputCls}
                            />
                          </Field>
                          <button
                            onClick={removeSelected}
                            className="w-full rounded border border-newsprint-accent px-2 py-1.5 text-newsprint-accent"
                          >
                             অংশ মুছে ফেলুন
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="no-print mt-4 flex gap-3 overflow-x-auto pb-2">
            {edition.pages.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setPageIndex(i)}
                className={`w-32 shrink-0 border bg-newsprint-paper p-1 text-left ${
                  i === pageIndex ? "border-newsprint-accent" : "border-newsprint-rule"
                }`}
              >
                 <div className="aspect-[13/20.5] overflow-hidden">
                  <div className="origin-top-left scale-[0.14] [width:714%]">
                    <NewspaperPage edition={edition} page={p} />
                  </div>
                </div>
                 <p className="mt-1 font-serif-bn text-[0.65rem] font-semibold">পৃষ্ঠা {p.no}</p>
                <p className="font-serif-bn text-[0.6rem] text-newsprint-muted">{p.title}</p>
              </button>
            ))}
             {edition.pages.length < 4 && <button
              onClick={addPage}
              className="grid w-32 shrink-0 place-items-center border border-dashed border-newsprint-rule font-sans text-xs text-newsprint-muted"
            >
               + পৃষ্ঠা যোগ করুন
             </button>}
          </div>
          </>}
        </main>
      </div>

      {toast && (
        <div className="no-print fixed bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-newsprint-ink px-4 py-2 font-serif-bn text-sm text-newsprint-paper shadow-paper">
          {toast}
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded border border-newsprint-rule bg-newsprint-paper px-2 py-1.5 font-serif-bn text-xs";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.62rem] text-newsprint-muted">{label}</span>
      {children}
    </label>
  );
}
