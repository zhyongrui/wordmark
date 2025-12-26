import { describe, expect, it } from "vitest";
import type { WordEntry } from "../../../src/shared/storage/schema";
import { filterWordEntries, sortWordEntries } from "../../../src/shared/word/list";

const makeEntry = (overrides: Partial<WordEntry>): WordEntry => ({
  normalizedWord: "word",
  displayWord: "Word",
  queryCount: 1,
  lastQueriedAt: "2025-01-01T00:00:00.000Z",
  definition: null,
  pronunciationAvailable: false,
  ...overrides
});

describe("sortWordEntries", () => {
  it("sorts by queryCount desc then lastQueriedAt desc", () => {
    const entries = [
      makeEntry({ normalizedWord: "alpha", queryCount: 2, lastQueriedAt: "2025-01-01T00:00:00.000Z" }),
      makeEntry({ normalizedWord: "beta", queryCount: 3, lastQueriedAt: "2025-01-03T00:00:00.000Z" }),
      makeEntry({ normalizedWord: "gamma", queryCount: 3, lastQueriedAt: "2025-01-02T00:00:00.000Z" })
    ];

    const sorted = sortWordEntries(entries);
    expect(sorted.map((entry) => entry.normalizedWord)).toEqual(["beta", "gamma", "alpha"]);
  });
});

describe("filterWordEntries", () => {
  it("filters entries by case-insensitive query against word fields", () => {
    const entries = [
      makeEntry({ normalizedWord: "hello", displayWord: "Hello" }),
      makeEntry({ normalizedWord: "world", displayWord: "World" }),
      makeEntry({ normalizedWord: "well-being", displayWord: "Well-being" })
    ];

    const filtered = filterWordEntries(entries, "WO");
    expect(filtered.map((entry) => entry.normalizedWord)).toEqual(["world"]);
  });

  it("returns all entries for an empty query", () => {
    const entries = [makeEntry({ normalizedWord: "hello" }), makeEntry({ normalizedWord: "world" })];
    const filtered = filterWordEntries(entries, "   ");
    expect(filtered).toHaveLength(2);
  });
});
