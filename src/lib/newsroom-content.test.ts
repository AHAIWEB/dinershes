import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clampColumnSpan, fullArticleBody, parseFeedXml } from "./newsroom-content";

describe("full article selection", () => {
  it("does not accept a short feed summary as a full report", () => {
    assert.deepEqual(fullArticleBody("", "সংক্ষিপ্ত ফিড বিবরণ"), { body: "", complete: false });
  });

  it("uses extracted article paragraphs as the full report", () => {
    const paragraphs = `${"প্রতিবেদনের পূর্ণ লেখা। ".repeat(20)}\n\n${"পরবর্তী অনুচ্ছেদ। ".repeat(10)}`;
    const result = fullArticleBody("", paragraphs);
    assert.equal(result.complete, true);
    assert.equal(result.body, paragraphs.trim());
  });
});

describe("RSS and Atom parsing", () => {
  it("keeps Atom link hrefs and RSS CDATA content", () => {
    const xml = `<feed><entry><title>Atom story</title><link rel="alternate" href="https://news.example/story"/><summary>Feed summary</summary></entry></feed><rss><channel><item><title>RSS story</title><link>https://news.example/rss</link><description><![CDATA[<p>RSS summary</p>]]></description></item></channel></rss>`;
    const stories = parseFeedXml(xml);
    assert.deepEqual(stories.map((story) => story.link), [
      "https://news.example/rss",
      "https://news.example/story",
    ]);
  });
});

describe("six-column placement", () => {
  it("limits a span to the remaining columns on the 6-column page", () => {
    assert.equal(clampColumnSpan(4, 6), 2);
    assert.equal(clampColumnSpan(0, 6), 6);
  });
});