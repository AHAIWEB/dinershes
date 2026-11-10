import { describe, expect, it } from "bun:test";
import { clampColumnSpan, fullArticleBody, parseFeedXml } from "./newsroom-content";

describe("full article selection", () => {
  it("does not accept a short feed summary as a full report", () => {
    expect(fullArticleBody("", "সংক্ষিপ্ত ফিড বিবরণ" )).toEqual({ body: "", complete: false });
  });

  it("uses extracted article paragraphs as the full report", () => {
    const paragraphs = `${"প্রতিবেদনের পূর্ণ লেখা। ".repeat(20)}\n\n${"পরবর্তী অনুচ্ছেদ। ".repeat(10)}`;
    const result = fullArticleBody("", paragraphs);
    expect(result.complete).toBe(true);
    expect(result.body).toBe(paragraphs.trim());
  });
});

describe("RSS and Atom parsing", () => {
  it("keeps Atom link hrefs and RSS CDATA content", () => {
    const xml = `<feed><entry><title>Atom story</title><link rel="alternate" href="https://news.example/story"/><summary>Feed summary</summary></entry></feed><rss><channel><item><title>RSS story</title><link>https://news.example/rss</link><description><![CDATA[<p>RSS summary</p>]]></description></item></channel></rss>`;
    const stories = parseFeedXml(xml);
    expect(stories.map((story) => story.link)).toEqual([
      "https://news.example/rss",
      "https://news.example/story",
    ]);
  });
});

describe("six-column placement", () => {
  it("limits a span to the remaining columns on the 6-column page", () => {
    expect(clampColumnSpan(4, 6)).toBe(2);
    expect(clampColumnSpan(0, 6)).toBe(6);
  });
});