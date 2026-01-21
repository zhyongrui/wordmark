import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleTranslationRequest } from "../../../src/background/handlers/translation";
import { updateTranslationSettings } from "../../../src/shared/translation/settings";
import { clearTranslationApiKey, setTranslationApiKey } from "../../../src/shared/translation/secrets";
import { clearMoonshotConfig } from "../../../src/shared/translation/moonshot";
import { clearOpenAIConfig } from "../../../src/shared/translation/openai";
import { clearVolcengineConfig } from "../../../src/shared/translation/volcengine";
import { clearZhipuConfig } from "../../../src/shared/translation/zhipu";

const installMockChromeStorage = () => {
  const data: Record<string, unknown> = {};

  const local = {
    get: vi.fn(async (keys: string | string[]) => {
      const requestedKeys = Array.isArray(keys) ? keys : [keys];
      const result: Record<string, unknown> = {};
      for (const key of requestedKeys) {
        result[key] = data[key];
      }
      return result;
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      Object.assign(data, items);
    })
  };

  vi.stubGlobal("chrome", { storage: { local } });
  return { data, local };
};

describe("background translation handler gating", () => {
  beforeEach(() => {
    installMockChromeStorage();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns disabled and does not call fetch when translation is disabled", async () => {
    const response = await handleTranslationRequest({
      word: "hello",
      definition: "A greeting.",
      targetLang: "zh"
    });

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("disabled");
    }
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("returns not_configured and does not call fetch when enabled but no API key", async () => {
    await clearTranslationApiKey();
    await updateTranslationSettings({ enabled: true, providerId: "gemini" });

    const response = await handleTranslationRequest({
      word: "hello",
      definition: "A greeting.",
      targetLang: "zh"
    });

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("not_configured");
    }
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("returns not_configured and does not call fetch when Volcengine config is missing", async () => {
    await updateTranslationSettings({ enabled: true, providerId: "volcengine" });
    await setTranslationApiKey("volcengine", "test-key");
    await clearVolcengineConfig();

    const response = await handleTranslationRequest({
      word: "hello",
      definition: "A greeting.",
      targetLang: "zh"
    });

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("not_configured");
    }
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("returns not_configured and does not call fetch when Moonshot config is missing", async () => {
    await updateTranslationSettings({ enabled: true, providerId: "moonshot" });
    await setTranslationApiKey("moonshot", "test-key");
    await clearMoonshotConfig();

    const response = await handleTranslationRequest({
      word: "hello",
      definition: "A greeting.",
      targetLang: "zh"
    });

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("not_configured");
    }
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("returns not_configured and does not call fetch when OpenAI config is missing", async () => {
    await updateTranslationSettings({ enabled: true, providerId: "openai" });
    await setTranslationApiKey("openai", "test-key");
    await clearOpenAIConfig();

    const response = await handleTranslationRequest({
      word: "hello",
      definition: "A greeting.",
      targetLang: "zh"
    });

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("not_configured");
    }
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("returns not_configured and does not call fetch when Zhipu config is missing", async () => {
    await updateTranslationSettings({ enabled: true, providerId: "zhipu" });
    await setTranslationApiKey("zhipu", "test-key");
    await clearZhipuConfig();

    const response = await handleTranslationRequest({
      word: "hello",
      definition: "A greeting.",
      targetLang: "zh"
    });

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("not_configured");
    }
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
