import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { columnFillPercent } from "./print-columns";

describe("print column fill", () => {
  it("reports half a page of content as 50 percent", () => {
    assert.equal(columnFillPercent(500, 1000), 50);
  });

  it("caps overflow at a full page", () => {
    assert.equal(columnFillPercent(1200, 1000), 100);
  });
});