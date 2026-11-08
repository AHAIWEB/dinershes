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