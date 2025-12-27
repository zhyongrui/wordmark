import { describe, expect, it, vi } from "vitest";
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
  it("caches generated definitions by word", async () => {
    await updateTranslationSettings({ enabled: true, providerId: "gemini" });
    await setTranslationApiKey("gemini", "AIzaFakeKeyForTest");

    generateDefinition.mockResolvedValue({ ok: true, definitionEn: "A fruit." });
    handleTranslationRequest.mockResolvedValue({ ok: true, translatedWord: "苹果", translatedDefinition: "一种水果。" });

    const first = await handleDefinitionBackfillRequest({ word: "apple" });
    const second = await handleDefinitionBackfillRequest({ word: "apple" });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(generateDefinition).toHaveBeenCalledTimes(1);
  });
});
