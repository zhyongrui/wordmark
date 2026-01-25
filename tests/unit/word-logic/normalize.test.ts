import { describe, expect, it } from "vitest";
import { detectWordLanguage, normalizeWord } from "../../../src/shared/word/normalize";

describe("normalizeWord", () => {
  it("normalizes English tokens and keeps internal punctuation", () => {
    expect(normalizeWord("Apple")).toBe("apple");
    expect(normalizeWord("Don't")).toBe("don't");
    expect(normalizeWord("well-being")).toBe("well-being");
  });

  it("accepts pure Chinese tokens", () => {
    expect(normalizeWord("你好")).toBe("你好");
    expect(normalizeWord("中文词")).toBe("中文词");
  });

  it("rejects punctuation, digits, or mixed scripts", () => {
    expect(normalizeWord(" Apple, ")).toBeNull();
    expect(normalizeWord("(Hello!)")).toBeNull();
    expect(normalizeWord("hello123")).toBeNull();
    expect(normalizeWord("hello你好")).toBeNull();
    expect(normalizeWord("你好-world")).toBeNull();
  });

  it("rejects empty or multi-word selections", () => {
    expect(normalizeWord("")).toBeNull();
    expect(normalizeWord("   ")).toBeNull();
    expect(normalizeWord("!!!")).toBeNull();
    expect(normalizeWord("hello world")).toBeNull();
    expect(normalizeWord("apple banana")).toBeNull();
  });

  it("detects English or Chinese language", () => {
    expect(detectWordLanguage("Hello")).toBe("en");
    expect(detectWordLanguage("你好")).toBe("zh");
    expect(detectWordLanguage("hello你好")).toBeNull();
    expect(detectWordLanguage("hello-world!")).toBeNull();
  });
});
