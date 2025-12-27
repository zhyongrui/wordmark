import { describe, expect, it } from "vitest";
import type { TranslationResponse } from "../../../src/shared/translation/types";
import { mapTranslationOverlayModel } from "../../../src/content/lookup-overlay";

describe("lookup overlay translation mapping", () => {
  it("maps successful translation to new info architecture fields", () => {
    const response: TranslationResponse = {
      ok: true,
      translatedWord: "你好",
      translatedDefinition: "问候语。"
    };

    const model = mapTranslationOverlayModel({
      englishDefinition: "A greeting.",
      translation: response
    });

    expect(model.topText).toContain("你好");
    expect(model.englishDefinitionText).toBe("A greeting.");
    expect(model.definitionZhText).toContain("问候语");
  });

  it("maps missing English definition to Definition unavailable and omits definition-translation block", () => {
    const response: TranslationResponse = {
      ok: true,
      translatedWord: "你好",
      translatedDefinition: null
    };

    const model = mapTranslationOverlayModel({
      englishDefinition: null,
      translation: response
    });

    expect(model.topText).toContain("你好");
    expect(model.englishDefinitionText).toBe("Definition unavailable.");
    expect(model.definitionZhText).toBeNull();
  });

  it("maps translation failures to a short retry hint", () => {
    const response: TranslationResponse = {
      ok: false,
      error: "provider_error",
      message: "Translation unavailable (HTTP 500)."
    };

    const model = mapTranslationOverlayModel({
      englishDefinition: "A greeting.",
      translation: response
    });

    expect(model.topText).toContain("Translation");
    expect(model.topText).toContain("shortcut");
    expect(model.englishDefinitionText).toBe("A greeting.");
  });
});

