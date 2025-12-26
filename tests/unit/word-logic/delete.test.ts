import { beforeEach, describe, expect, it } from "vitest";
import { __resetMemoryStore, deleteWordEntry, readStore, recordLookup } from "../../../src/shared/word/store";

describe("deleteWordEntry", () => {
  beforeEach(() => {
    __resetMemoryStore();
  });

  it("removes an existing entry by normalized word", async () => {
    await recordLookup({
      normalizedWord: "hello",
      displayWord: "Hello",
      definition: "A greeting.",
      pronunciationAvailable: false
    });
    await recordLookup({
      normalizedWord: "world",
      displayWord: "World",
      definition: "The earth and its people.",
      pronunciationAvailable: false
    });

    await deleteWordEntry("hello");
    const store = await readStore();

    expect(store.wordsByKey.hello).toBeUndefined();
    expect(store.wordsByKey.world?.normalizedWord).toBe("world");
  });

  it("ignores missing entries without touching existing ones", async () => {
    await recordLookup({
      normalizedWord: "hello",
      displayWord: "Hello",
      definition: "A greeting.",
      pronunciationAvailable: false
    });

    await deleteWordEntry("missing");
    const store = await readStore();

    expect(store.wordsByKey.hello?.normalizedWord).toBe("hello");
  });
});
