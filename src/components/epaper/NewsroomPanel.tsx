import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Globe2, LoaderCircle, WandSparkles } from "lucide-react";
import { approveArticle, createAiDraft, fetchSourceUrl } from "@/lib/newsroom.functions";
import { SECTIONS } from "@/lib/epaper-data";

type Draft = {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  body: string;
  keyFacts: string[];
  imageCaption: string;
  sourceNote: string;
  warnings: string[];
};

export function NewsroomPanel({
  onPlace,
  initialUrl,
  initialSection,
}: {
  onPlace: (draft: Draft & { section: string }) => void;
  initialUrl?: string;
  initialSection?: string;
}) {
  const fetchSource = useServerFn(fetchSourceUrl);
  const generate = useServerFn(createAiDraft);
  const approve = useServerFn(approveArticle);
  const [url, setUrl] = useState("");
  const [sourceId, setSourceId] = useState<string>();
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [image, setImage] = useState<string>();
  const [facts, setFacts] = useState("");
  const [instructions, setInstructions] = useState("");
  const [section, setSection] = useState("প্রচ্ছদ");
  const [mode, setMode] = useState<"full" | "brief" | "custom">("full");
  const [fields, setFields] = useState(["শিরোনাম", "সারাংশ", "প্রতিবেদন"]);
  const [draft, setDraft] = useState<Draft>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (initialUrl) setUrl(initialUrl);
    if (initialSection) setSection(initialSection);
  }, [initialUrl, initialSection]);
  const importUrl = async () => {
    setBusy(true);
    setMessage("");
    try {
      const result = await fetchSource({ data: { url } });
      setSourceId(result.id);
      setSourceTitle(result.title);
      setSourceText(result.text);
      setImage(result.image);
      setMessage(`উৎস সংগ্রহ হয়েছে · ${result.domain}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "URL থেকে খবর আনা যায়নি।");
    } finally {
      setBusy(false);
    }
  };
  const makeDraft = async () => {
    setBusy(true);
    setMessage("");
    try {
      const result = await generate({
        data: {
          ...(sourceId ? { sourceId } : {}),
          title: sourceTitle,
          text: sourceText,
          facts,
          instructions,
          ...(url ? { sourceUrl: url } : {}),
          mode,
          fields,
          section,
        },
      });
      setDraft(result);
      setMessage("AI খসড়া প্রস্তুত—সম্পাদনা ও যাচাই করুন।");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "AI খসড়া তৈরি হয়নি।");
    } finally {
      setBusy(false);
    }
  };
  const approveDraft = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      await approve({
        data: {
          id: draft.id,
          title: draft.title,
          subtitle: draft.subtitle,
          summary: draft.summary,
          body: draft.body,
          section,
        },
      });
      onPlace({ ...draft, section });
      setMessage("অনুমোদিত সংবাদটি বর্তমান পাতায় যোগ হয়েছে।");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "অনুমোদন সম্পন্ন হয়নি।");
    } finally {
      setBusy(false);
    }
  };
  const setDraftField = (key: keyof Draft, value: string) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));

  return (
    <section className="border border-newsprint-rule bg-newsprint-paper">
      <div className="border-b border-newsprint-rule px-5 py-4">
        <p className="font-sans text-xs font-semibold text-newsprint-accent">AI নিউজরুম</p>
        <h1 className="font-serif-bn text-2xl font-bold">উৎস থেকে প্রকাশযোগ্য খসড়া</h1>
        <p className="font-serif-bn text-sm text-newsprint-muted">
          উৎস সংগ্রহ করুন, তথ্য দিন, তারপর সম্পাদকের অনুমোদনে পাতায় বসান।
        </p>
      </div>
      <div className="grid gap-0 xl:grid-cols-2">
        <div className="space-y-4 border-b border-newsprint-rule p-5 xl:border-b-0 xl:border-r">
          <div>
            <label className="font-serif-bn text-sm font-bold">অনলাইন সংবাদের URL</label>
            <div className="mt-1 flex gap-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className={input}
              />
              <button onClick={importUrl} disabled={busy || !url} className={primary}>
                <Globe2 size={16} /> ফেচ করুন
              </button>
            </div>
          </div>
          <label className="block">
            <span className={label}>উৎসের শিরোনাম</span>
            <input
              value={sourceTitle}
              onChange={(e) => setSourceTitle(e.target.value)}
              className={input}
            />
          </label>
          <label className="block">
            <span className={label}>উৎসের লেখা</span>
            <textarea
              rows={10}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              className={input}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className={label}>গুরুত্বপূর্ণ তথ্য</span>
              <textarea
                rows={4}
                value={facts}
                onChange={(e) => setFacts(e.target.value)}
                className={input}
              />
            </label>
            <label>
              <span className={label}>সম্পাদকের নির্দেশনা</span>
              <textarea
                rows={4}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className={input}
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className={label}>বিভাগ</span>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className={input}
              >
                {SECTIONS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <div>
              <span className={label}>AI আউটপুট</span>
              <div className="flex border border-newsprint-rule">
                {(
                  [
                    { k: "full", l: "পূর্ণ প্যাক" },
                    { k: "brief", l: "সংক্ষিপ্ত" },
                    { k: "custom", l: "নিজে বাছাই" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.k}
                    onClick={() => setMode(item.k)}
                    className={`flex-1 px-2 py-2 font-serif-bn text-xs ${mode === item.k ? "bg-newsprint-ink text-newsprint-paper" : ""}`}
                  >
                    {item.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {mode === "custom" && (
            <div className="flex flex-wrap gap-2">
              {["শিরোনাম", "উপশিরোনাম", "সারাংশ", "প্রতিবেদন", "গুরুত্বপূর্ণ তথ্য", "ক্যাপশন"].map(
                (item) => (
                  <label
                    key={item}
                    className="flex items-center gap-1 border border-newsprint-rule px-2 py-1 font-serif-bn text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={fields.includes(item)}
                      onChange={(e) =>
                        setFields((old) =>
                          e.target.checked ? [...old, item] : old.filter((v) => v !== item),
                        )
                      }
                    />
                    {item}
                  </label>
                ),
              )}
            </div>
          )}
          <button
            onClick={makeDraft}
            disabled={busy || sourceText.length < 20}
            className={`${primary} w-full justify-center py-3`}
          >
            {busy ? (
              <LoaderCircle className="animate-spin" size={17} />
            ) : (
              <WandSparkles size={17} />
            )}{" "}
            AI খসড়া তৈরি করুন
          </button>
          {message && (
            <p
              role="status"
              className="border-l-2 border-newsprint-accent pl-3 font-serif-bn text-sm text-newsprint-muted"
            >
              {message}
            </p>
          )}
        </div>
        <div className="p-5">
          {draft ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif-bn text-xl font-bold">সম্পাদনার খসড়া</h2>
                <span className="border border-newsprint-accent px-2 py-1 font-sans text-[0.65rem] text-newsprint-accent">
                  অনুমোদনের অপেক্ষায়
                </span>
              </div>
              {image && (
                <img
                  src={image}
                  alt="উৎসের প্রধান ছবি"
                  className="aspect-[16/7] w-full object-cover"
                />
              )}
              <label>
                <span className={label}>শিরোনাম</span>
                <textarea
                  rows={2}
                  value={draft.title}
                  onChange={(e) => setDraftField("title", e.target.value)}
                  className={`${input} font-serif-bn text-xl font-bold`}
                />
              </label>
              <label>
                <span className={label}>উপশিরোনাম</span>
                <textarea
                  rows={2}
                  value={draft.subtitle}
                  onChange={(e) => setDraftField("subtitle", e.target.value)}
                  className={input}
                />
              </label>
              <label>
                <span className={label}>সারাংশ</span>
                <textarea
                  rows={3}
                  value={draft.summary}
                  onChange={(e) => setDraftField("summary", e.target.value)}
                  className={input}
                />
              </label>
              <label>
                <span className={label}>প্রতিবেদন</span>
                <textarea
                  rows={12}
                  value={draft.body}
                  onChange={(e) => setDraftField("body", e.target.value)}
                  className={input}
                />
              </label>
              {draft.keyFacts.length > 0 && (
                <div className="bg-newsprint-tint p-3">
                  <p className={label}>গুরুত্বপূর্ণ তথ্য</p>
                  <ul className="list-disc pl-5 font-serif-bn text-sm">
                    {draft.keyFacts.map((fact) => (
                      <li key={fact}>{fact}</li>
                    ))}
                  </ul>
                </div>
              )}
              {draft.warnings.length > 0 && (
                <div className="border border-newsprint-accent p-3 font-serif-bn text-sm text-newsprint-accent">
                  {draft.warnings.join(" · ")}
                </div>
              )}
              <button
                onClick={approveDraft}
                disabled={busy}
                className={`${primary} w-full justify-center py-3`}
              >
                <Check size={17} /> অনুমোদন করে পাতায় যোগ করুন
              </button>
            </div>
          ) : (
            <div className="grid min-h-80 place-items-center border border-dashed border-newsprint-rule bg-newsprint-tint p-8 text-center">
              <div>
                <WandSparkles className="mx-auto text-newsprint-accent" />
                <p className="mt-3 font-serif-bn text-lg font-bold">খসড়া এখানে দেখা যাবে</p>
                <p className="font-serif-bn text-sm text-newsprint-muted">
                  AI শুধু আপনার দেওয়া উৎস ও তথ্য ব্যবহার করবে।
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const input =
  "mt-1 w-full border border-newsprint-rule bg-newsprint-paper px-3 py-2 font-serif-bn text-sm outline-none focus:border-newsprint-accent";
const label = "block font-serif-bn text-xs font-semibold text-newsprint-muted";
const primary =
  "flex shrink-0 items-center gap-2 bg-newsprint-ink px-4 py-2 font-serif-bn text-sm text-newsprint-paper disabled:opacity-40";
