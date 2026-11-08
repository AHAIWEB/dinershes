import { describe, expect, it } from "bun:test";
import { columnFillPercent } from "./print-columns";

describe("print column fill", () => {
  it("reports half a page of content as 50 percent", () => {
    expect(columnFillPercent(500, 1000)).toBe(50);
  });

  it("caps overflow at a full page", () => {
    expect(columnFillPercent(1200, 1000)).toBe(100);
  });
});