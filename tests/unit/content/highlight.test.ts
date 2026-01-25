import { describe, expect, it } from "vitest";
import { buildHighlightPattern } from "../../../src/content/highlight";

describe("highlight engine", () => {
  it("builds a combined pattern that matches Chinese words", () => {
    const { pattern, hasChineseWords } = buildHighlightPattern(["你好", "世界"]);
    expect(hasChineseWords).toBe(true);

    pattern.lastIndex = 0;
    const matches: string[] = [];
    let next: RegExpExecArray | null;
    while ((next = pattern.exec("你好 世界 hello")) !== null) {
      matches.push(next[0]);
    }

    expect(matches).toContain("你好");
    expect(matches).toContain("世界");
    expect(matches).toContain("hello");
  });

  it("falls back to English-only matching when no Chinese words are present", () => {
    const { pattern, hasChineseWords } = buildHighlightPattern(["hello"]);
    expect(hasChineseWords).toBe(false);

    pattern.lastIndex = 0;
    const matches: string[] = [];
    let next: RegExpExecArray | null;
    while ((next = pattern.exec("hello 你好")) !== null) {
      matches.push(next[0]);
    }

    expect(matches).toEqual(["hello"]);
  });
});
