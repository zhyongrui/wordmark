import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleTranslationRequest } from "../../../src/background/handlers/translation";
import { setTranslationApiKey } from "../../../src/shared/translation/secrets";
import { updateTranslationSettings } from "../../../src/shared/translation/settings";

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

const makeGeminiResponse = (payload: { translatedWord: string; translatedDefinition?: string | null }) => {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify(payload) }]
          }
        }
      ]
    })
  } as unknown as Response;
};

describe("background translation handler success/degrade", () => {
  beforeEach(() => {
    installMockChromeStorage();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns translations for word-only", async () => {
    await updateTranslationSettings({ enabled: true, providerId: "gemini" });
    await setTranslationApiKey("gemini", "test-key");

    const fetchMock = vi.fn(async () => makeGeminiResponse({ translatedWord: "你好" }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleTranslationRequest({
      word: "hello-word-only",
      definition: null,
      targetLang: "zh"
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.translatedWord).toBe("你好");
    }
  });

  it("dedupes identical concurrent requests (single provider call)", async () => {
    await updateTranslationSettings({ enabled: true, providerId: "gemini" });
    await setTranslationApiKey("gemini", "test-key");

    const fetchMock = vi.fn(async () => makeGeminiResponse({ translatedWord: "你好" }));
    vi.stubGlobal("fetch", fetchMock);

    const first = handleTranslationRequest({ word: "hello-dedupe", definition: null, targetLang: "zh" });
    const second = handleTranslationRequest({ word: "hello-dedupe", definition: null, targetLang: "zh" });

    await expect(first).resolves.toMatchObject({ ok: true });
    await expect(second).resolves.toMatchObject({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps provider errors to stable error codes", async () => {
    await updateTranslationSettings({ enabled: true, providerId: "gemini" });
    await setTranslationApiKey("gemini", "test-key");

    const fetchMock = vi.fn(async () => ({ ok: false, status: 429 }) as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleTranslationRequest({
      word: "hello-error",
      definition: null,
      targetLang: "zh"
    });

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("quota_exceeded");
    }
  });
});
