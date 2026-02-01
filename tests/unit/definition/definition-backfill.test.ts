import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateTranslationSettings } from "../../../src/shared/translation/settings";
import { setTranslationApiKey } from "../../../src/shared/translation/secrets";
import type { DefinitionResponse } from "../../../src/shared/definition/types";
import type { TranslationResponse } from "../../../src/shared/translation/types";

const { generateDefinition, handleTranslationRequest } = vi.hoisted(() => ({
  generateDefinition: vi.fn<() => Promise<DefinitionResponse>>(),
  handleTranslationRequest: vi.fn<() => Promise<TranslationResponse>>()
}));

vi.mock("../../../src/shared/definition/providers/gemini", () => {
  return {
    geminiDefinitionProvider: {
      id: "gemini",
      generateDefinition
    }
  };
});

vi.mock("../../../src/background/handlers/translation", () => {
  return {
    handleTranslationRequest
  };
});

import { handleDefinitionBackfillRequest } from "../../../src/background/handlers/definition-backfill";

describe("definition backfill handler", () => {
  beforeEach(() => {
    generateDefinition.mockReset();
    handleTranslationRequest.mockReset();
  });

  it("caches generated definitions by word", async () => {
    await updateTranslationSettings({
      enabled: true,
      providerId: "gemini",
      mode: "single",
      singleDirection: "EN->ZH",
      definitionBackfillEnabled: true,
      definitionTranslationEnabled: true
    });
    await setTranslationApiKey("gemini", "AIzaFakeKeyForTest");

    generateDefinition.mockResolvedValue({ ok: true, definitionText: "A fruit.", definitionLang: "en" });
    handleTranslationRequest.mockResolvedValue({ ok: true, translatedWord: "苹果", translatedDefinition: "一种水果。" });

    const first = await handleDefinitionBackfillRequest({ word: "apple" });
    const second = await handleDefinitionBackfillRequest({ word: "apple" });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(generateDefinition).toHaveBeenCalledTimes(1);
  });

  it("returns zh definitions with en translation for Chinese source words", async () => {
    await updateTranslationSettings({
      enabled: true,
      providerId: "gemini",
      mode: "single",
      singleDirection: "ZH->EN",
      definitionBackfillEnabled: true,
      definitionTranslationEnabled: true
    });
    await setTranslationApiKey("gemini", "AIzaFakeKeyForTest");

    generateDefinition.mockResolvedValue({ ok: true, definitionText: "一种问候语。", definitionLang: "zh" });
    handleTranslationRequest.mockResolvedValue({ ok: true, translatedWord: "hello", translatedDefinition: "A greeting." });

    const response = await handleDefinitionBackfillRequest({ word: "你好" });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.definitionSourceLang).toBe("zh");
      expect(response.definitionZh).toBe("一种问候语。");
      expect(response.definitionEn).toBe("A greeting.");
    }
  });

  it("skips definition translation when disabled", async () => {
    await updateTranslationSettings({
      enabled: true,
      providerId: "gemini",
      definitionBackfillEnabled: true,
      definitionTranslationEnabled: false
    });
    await setTranslationApiKey("gemini", "AIzaFakeKeyForTest");

    generateDefinition.mockResolvedValue({ ok: true, definitionText: "A fruit.", definitionLang: "en" });

    const response = await handleDefinitionBackfillRequest({ word: "apple" });

    expect(handleTranslationRequest).not.toHaveBeenCalled();
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.definitionEn).toBe("A fruit.");
      expect(response.definitionZh).toBeNull();
    }
  });

  it("accepts an explicit JA sourceLang for Kanji-only tokens", async () => {
    await updateTranslationSettings({
      enabled: true,
      providerId: "gemini",
      mode: "single",
      singleDirection: "JA->ZH",
      definitionBackfillEnabled: true,
      definitionTranslationEnabled: false
    });
    await setTranslationApiKey("gemini", "AIzaFakeKeyForTest");

    generateDefinition.mockResolvedValue({ ok: true, definitionText: "学校。教育を行う機関。", definitionLang: "ja" });

    const response = await handleDefinitionBackfillRequest({ word: "学校", sourceLang: "ja" });

    expect(generateDefinition).toHaveBeenCalledWith({ word: "学校", sourceLang: "ja" }, expect.any(String));
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.definitionSourceLang).toBe("ja");
      expect(response.definitionJa).toBe("学校。教育を行う機関。");
      expect(response.definitionZh).toBeNull();
    }
  });
});
