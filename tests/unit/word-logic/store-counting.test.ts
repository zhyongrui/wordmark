import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetMemoryStore, recordLookup } from "../../../src/shared/word/store";

describe("recordLookup", () => {
  beforeEach(() => {
    __resetMemoryStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a new entry with count 1 and timestamp", async () => {
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));

    const entry = await recordLookup({
      normalizedWord: "hello",
      displayWord: "Hello",
      definition: "A greeting.",
      pronunciationAvailable: true
    });

    expect(entry.queryCount).toBe(1);
    expect(entry.lastQueriedAt).toBe("2025-01-01T00:00:00.000Z");
  });

  it("increments count and updates lastQueriedAt on repeat lookup", async () => {
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    await recordLookup({
      normalizedWord: "hello",
      displayWord: "Hello",
      definition: "A greeting.",
      pronunciationAvailable: true
    });

    vi.setSystemTime(new Date("2025-01-01T00:01:00Z"));
    const entry = await recordLookup({
      normalizedWord: "hello",
      displayWord: "Hello",
      definition: "A greeting.",
      pronunciationAvailable: true
    });

    expect(entry.queryCount).toBe(2);
    expect(entry.lastQueriedAt).toBe("2025-01-01T00:01:00.000Z");
  });
});
