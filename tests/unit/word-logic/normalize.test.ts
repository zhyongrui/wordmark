import { describe, expect, it } from "vitest";
import { normalizeWord } from "../../../src/shared/word/normalize";

describe("normalizeWord", () => {
  it("lowercases and trims leading/trailing punctuation", () => {
    expect(normalizeWord(" Apple, ")).toBe("apple");
    expect(normalizeWord("(Hello!)")).toBe("hello");
  });

  it("keeps internal apostrophes and hyphens", () => {
    expect(normalizeWord("Don't")).toBe("don't");
    expect(normalizeWord("well-being")).toBe("well-being");
  });

  it("rejects empty or punctuation-only selections", () => {
    expect(normalizeWord("")).toBeNull();
    expect(normalizeWord("   ")).toBeNull();
    expect(normalizeWord("!!!")).toBeNull();
  });

  it("rejects multi-word selections", () => {
    expect(normalizeWord("hello world")).toBeNull();
    expect(normalizeWord("apple, banana")).toBeNull();
  });
});
