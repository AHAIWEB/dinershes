import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { parseHTML } from "linkedom";
import { createRunIdFetch } from "./gateway/run-id.ts";
import { fullArticleBody } from "./newsroom-content";

export type NewsroomMode = "full" | "brief" | "custom";

const blockedHosts =
  /^(localhost|.*\.localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|::1$)/i;
const blockedPrivate172 = /^172\.(1[6-9]|2\d|3[01])\./;

function safeUrl(value: string) {
  const url = new URL(value);
  if (
    !/^https?:$/.test(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && url.port !== "80" && url.port !== "443") ||
    blockedHosts.test(url.hostname) ||
    blockedPrivate172.test(url.hostname) ||
    /^\d+(?:\.\d+){3}$/.test(url.hostname) ||
    /^(?:0x[\da-f]+|\d+)$/i.test(url.hostname) ||
    url.hostname.startsWith("[") ||
    !url.hostname.includes(".")
  ) {
    throw new Error("এই ঠিকানা থেকে খবর সংগ্রহ নিরাপদ নয়।");
  }
  return url;
}

export async function scrapeArticle(sourceUrl: string) {
  let url = safeUrl(sourceUrl);
  let response: Response | undefined;
  for (let i = 0; i < 4; i += 1) {
    response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
      headers: { "User-Agent": "DinerSheshKhobor/1.0 (+newsroom article reader)" },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) break;
      url = safeUrl(new URL(location, url).toString());
      continue;
    }
    break;
  }
  if (!response?.ok)
    throw new Error("ওয়েবসাইটটি লেখা পড়ার অনুমতি দেয়নি বা পাতাটি পাওয়া যায়নি।");
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html"))
    throw new Error("এই URL-এ পাঠযোগ্য সংবাদ পৃষ্ঠা পাওয়া যায়নি।");
  const html = (await response.text()).slice(0, 2_000_000);
  const { document } = parseHTML(html);
  // Structured data often carries the full article body even on script-rendered sites.
  let ldBody = "";
  document.querySelectorAll('script[type="application/ld+json"]').forEach((node) => {
    try {
      const walk = (v: unknown): void => {
        if (!v || typeof v !== "object") return;
        if (Array.isArray(v)) return v.forEach(walk);
        const o = v as Record<string, unknown>;
        const body = o["articleBody"];
        if (typeof body === "string" && body.length > ldBody.length) ldBody = body;
        Object.values(o).forEach(walk);
      };
      walk(JSON.parse(node.textContent ?? ""));
    } catch {
      /* ignore malformed JSON-LD */
    }
  });
  document
    .querySelectorAll("script,style,noscript,nav,footer,aside,form,header,iframe")
    .forEach((node) => node.remove());
  // Pick the container whose paragraphs hold the most text.
  let best = "";
  const candidates = [
    ...document.querySelectorAll("article, main, [itemprop=articleBody], .content, .details, .news-details, .post-content, .entry-content, div"),
  ].slice(0, 3000);
  for (const el of candidates) {
    const paras = [...el.querySelectorAll(":scope > p, :scope > div > p")]
      .map((p) => (p.textContent ?? "").trim())
      .filter((t) => t.length > 30);
    const joined = paras.join("\n\n");
    if (joined.length > best.length) best = joined;
  }
  const description =
    document.querySelector('meta[property="og:description"]')?.getAttribute("content") ??
    document.querySelector('meta[name="description"]')?.getAttribute("content") ??
    "";
  const extracted = fullArticleBody(ldBody, best);
  const text = extracted.body.slice(0, 18_000);
  if (!extracted.complete) throw new Error("এই পাতায় পূর্ণ প্রতিবেদন পাওয়া যায়নি। নির্দিষ্ট খবরের লিংক দিন।");
  const title =
    document.querySelector('meta[property="og:title"]')?.getAttribute("content") ??
    document.querySelector("h1")?.textContent?.trim() ??
    document.title;
  const image =
    document.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? undefined;
  let imageUrl: string | undefined;
  if (image) {
    try {
      const candidate = new URL(image, url);
      if (candidate.protocol === "https:") imageUrl = candidate.toString();
    } catch {
      /* Invalid image metadata should not prevent reading the article. */
    }
  }
  return {
    title: title.trim().slice(0, 300),
    text,
    complete: true,
    image: imageUrl,
    url: url.toString(),
    domain: url.hostname.replace(/^www\./, ""),
    fetchedAt: new Date().toISOString(),
  };
}

export async function generateNewsDraft(input: {
  title: string;
  text: string;
  facts: string;
  instructions: string;
  sourceUrl?: string;
  mode: NewsroomMode;
  fields: string[];
}) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Lovable AI এখনো প্রস্তুত নয়।");
  const runIdFetch = createRunIdFetch();
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  const requested =
    input.mode === "full"
      ? "শিরোনাম, উপশিরোনাম, সারাংশ, প্রতিবেদন, গুরুত্বপূর্ণ তথ্য, ছবির ক্যাপশন ও উৎস নোট"
      : input.mode === "brief"
        ? "শিরোনাম, উপশিরোনাম ও সংক্ষিপ্ত সারাংশ"
        : input.fields.join(", ");
  const prompt = `আপনি একটি বাংলা সংবাদপত্রের সতর্ক কপি সম্পাদক। শুধু নিচের উৎসে থাকা তথ্য ব্যবহার করুন। কোনো নাম, সংখ্যা, উদ্ধৃতি বা ঘটনা উদ্ভাবন করবেন না। সন্দেহ বা অসংগতি থাকলে সতর্কতা অংশে লিখুন।\n\nপ্রয়োজনীয় আউটপুট: ${requested}\nশিরোনাম: ${input.title}\nউৎস: ${input.sourceUrl ?? "সম্পাদকের নিজস্ব তথ্য"}\nগুরুত্বপূর্ণ তথ্য: ${input.facts}\nসম্পাদকের নির্দেশনা: ${input.instructions}\nউৎস লেখা:\n${input.text.slice(0, 16000)}\n\nশুধু বৈধ JSON দিন, markdown নয়। এই keys ব্যবহার করুন: title, subtitle, summary, body, keyFacts (string array), imageCaption, sourceNote, warnings (string array)। অপ্রয়োজনীয় field-এ খালি string বা empty array দিন।`;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    prompt,
    maxRetries: 0,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "medium",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const raw = await result.text;
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned) as {
      title: string;
      subtitle: string;
      summary: string;
      body: string;
      keyFacts: string[];
      imageCaption: string;
      sourceNote: string;
      warnings: string[];
    };
  } catch {
    throw new Error("AI খসড়াটি সঠিক কাঠামোয় আসেনি। আবার চেষ্টা করুন।");
  }
}

export type FeedItem = {
  title: string;
  link: string;
  summary: string;
  image?: string;
  published?: string;
};

/** Reads an RSS 2.0 or Atom feed using raw XML so Atom link elements remain intact. */
export async function fetchFeed(feedUrl: string): Promise<FeedItem[]> {
  let url = safeUrl(feedUrl);
  let response: Response | undefined;
  for (let i = 0; i < 4; i += 1) {
    response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
      headers: { "User-Agent": "DinerSheshKhobor/1.0 (+newsroom feed reader)" },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) break;
      url = safeUrl(new URL(location, url).toString());
      continue;
    }
    break;
  }
  if (!response?.ok) throw new Error("ফিডটি এখন সাড়া দিচ্ছে না।");
  const xml = (await response.text()).slice(0, 3_000_000);
  if (!/<(rss|feed|rdf)/i.test(xml)) throw new Error("এই ঠিকানায় RSS ফিড পাওয়া যায়নি।");
  const decodeXml = (value: string) => value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const strip = (value: string) => decodeXml(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const tagText = (node: string, names: string[]) => {
    for (const name of names) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const found = new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}\\s*>`, "i").exec(node);
      if (found?.[1]) return found[1];
    }
    return "";
  };
  const entries = ["item", "entry"].flatMap((tag) => {
    const expression = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, "gi");
    return [...xml.matchAll(expression)].map((match) => match[0]);
  }).slice(0, 25);
  return entries
    .map((node) => {
      const title = strip(tagText(node, ["title"])).slice(0, 300);
      const linkTag = /<link\b([^>]*)>([\s\S]*?)<\/link\s*>|<link\b([^>]*)\/?\s*>/i.exec(node);
      const href = /\bhref\s*=\s*(["'])(.*?)\1/i.exec(linkTag?.[1] ?? linkTag?.[3] ?? "")?.[2] ?? "";
      const link = strip(href || linkTag?.[2] || tagText(node, ["guid"]));
      const rawDesc = tagText(node, ["description", "summary", "content:encoded", "content"]);
      const imageTag = /<(?:enclosure|media:content)\b([^>]*)\/?\s*>/i.exec(node);
      const media = /\b(?:url|href)\s*=\s*(["'])(.*?)\1/i.exec(imageTag?.[1] ?? "")?.[2]
        ?? /<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/i.exec(node)?.[2];
      const image = media ? decodeXml(media.trim()) : "";
      const published = strip(tagText(node, ["pubDate", "published", "updated"]));
      return {
        title,
        link,
        summary: strip(rawDesc).slice(0, 600),
        ...(image.startsWith("https://") ? { image } : {}),
        ...(published ? { published } : {}),
      };
    })
    .filter((item) => item.title && /^https?:\/\//.test(item.link));
}
