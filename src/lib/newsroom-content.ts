/** Return only text extracted from an article body, never RSS/description fallback text. */
export function fullArticleBody(structuredBody: string, paragraphBody: string) {
  const structured = structuredBody.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const paragraphs = paragraphBody.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const body = [structured, paragraphs].sort((a, b) => b.length - a.length)[0] ?? "";
  const complete = structured.length >= 120 || paragraphs.length >= 300;
  return { body: complete ? body : "", complete };
}

/** Keep an editorially selected column span within the six-column sheet. */
export function clampColumnSpan(columnIndex: number, requestedSpan: number, totalColumns = 6) {
  const columns = Math.max(1, Math.trunc(totalColumns));
  const start = Math.min(columns - 1, Math.max(0, Math.trunc(columnIndex)));
  const span = Number.isFinite(requestedSpan) ? Math.trunc(requestedSpan) : 1;
  return Math.max(1, Math.min(columns - start, span));
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, number: string) => String.fromCodePoint(Number(number)))
    .replace(/&#x([\da-f]+);/gi, (_, number: string) => String.fromCodePoint(parseInt(number, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

const stripXmlText = (value: string) => decodeXml(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

function textFromTag(node: string, names: string[]) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const found = new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}\\s*>`, "i").exec(node);
    if (found?.[1]) return found[1];
  }
  return "";
}

export type ParsedFeedItem = { title: string; link: string; summary: string; image?: string; published?: string };

/** Parses bounded RSS/Atom XML without HTML parser mutations to Atom link attributes. */
export function parseFeedXml(xml: string): ParsedFeedItem[] {
  if (!/<(?:rss|feed|rdf)\b/i.test(xml)) throw new Error("এই ঠিকানায় RSS ফিড পাওয়া যায়নি।");
  const entries = ["item", "entry"].flatMap((tag) => {
    const expression = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, "gi");
    return [...xml.matchAll(expression)].map((match) => match[0]);
  }).slice(0, 25);
  return entries
    .map((node) => {
      const title = stripXmlText(textFromTag(node, ["title"])).slice(0, 300);
      const linkTag = /<link\b([^>]*)>([\s\S]*?)<\/link\s*>|<link\b([^>]*)\/?\s*>/i.exec(node);
      const href = /\bhref\s*=\s*(["'])(.*?)\1/i.exec(linkTag?.[1] ?? linkTag?.[3] ?? "")?.[2] ?? "";
      const link = stripXmlText(href || linkTag?.[2] || textFromTag(node, ["guid"]));
      const rawSummary = textFromTag(node, ["description", "summary", "content:encoded", "content"]);
      const mediaTag = /<(?:enclosure|media:content)\b([^>]*)\/?\s*>/i.exec(node);
      const media = /\b(?:url|href)\s*=\s*(["'])(.*?)\1/i.exec(mediaTag?.[1] ?? "")?.[2]
        ?? /<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/i.exec(node)?.[2];
      const image = media ? decodeXml(media.trim()) : "";
      const published = stripXmlText(textFromTag(node, ["pubDate", "published", "updated"]));
      return {
        title,
        link,
        summary: stripXmlText(rawSummary).slice(0, 600),
        ...(image.startsWith("https://") ? { image } : {}),
        ...(published ? { published } : {}),
      };
    })
    .filter((item) => item.title && /^https?:\/\//.test(item.link));
}