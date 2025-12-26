import { describe, expect, it } from "vitest";
import { shapeLookupResult } from "../../../src/shared/word/lookup";

describe("shapeLookupResult", () => {
  it("uses dictionary definition when available", () => {
    const result = shapeLookupResult({
      normalizedWord: "hello",
      displayWord: "Hello",
      dictionaryEntry: { definition: "A greeting.", pronunciationAvailable: false },
      ttsAvailable: true
    });

    expect(result.definition).toBe("A greeting.");
    expect(result.pronunciationAvailable).toBe(true);
  });

  it("returns null definition when not found", () => {
    const result = shapeLookupResult({
      normalizedWord: "unknown",
      displayWord: "unknown",
      dictionaryEntry: null,
      ttsAvailable: true
    });

    expect(result.definition).toBeNull();
    expect(result.pronunciationAvailable).toBe(true);
  });

  it("reports pronunciation unavailable when TTS is missing", () => {
    const result = shapeLookupResult({
      normalizedWord: "hello",
      displayWord: "Hello",
      dictionaryEntry: { definition: "A greeting.", pronunciationAvailable: true },
      ttsAvailable: false
    });

    expect(result.pronunciationAvailable).toBe(false);
  });
});
