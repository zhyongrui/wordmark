import { describe, expect, it } from "vitest";
import { shapeLookupResult } from "../../../src/shared/word/lookup";

describe("shapeLookupResult", () => {
  it("returns lookup result without definition", () => {
    const result = shapeLookupResult({
      normalizedWord: "hello",
      displayWord: "Hello",
      ttsAvailable: true
    });

    expect(result.pronunciationAvailable).toBe(true);
    expect(result.normalizedWord).toBe("hello");
    expect(result.displayWord).toBe("Hello");
  });

  it("reports pronunciation unavailable when TTS is missing", () => {
    const result = shapeLookupResult({
      normalizedWord: "hello",
      displayWord: "Hello",
      ttsAvailable: false
    });

    expect(result.pronunciationAvailable).toBe(false);
  });

  it("trims display word", () => {
    const result = shapeLookupResult({
      normalizedWord: "hello",
      displayWord: "  Hello  ",
      ttsAvailable: true
    });

    expect(result.displayWord).toBe("Hello");
    expect(result.normalizedWord).toBe("hello");
  });
});
