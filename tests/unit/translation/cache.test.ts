import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInSessionDeduper } from "../../../src/shared/translation/cache";
import { handleTranslationRequest } from "../../../src/background/handlers/translation";
import { setTranslationApiKey } from "../../../src/shared/translation/secrets";
import { updateTranslationSettings } from "../../../src/shared/translation/settings";

describe("translation in-session de-dup", () => {
  it("dedupes identical concurrent requests to one underlying call", async () => {
    const { dedupe } = createInSessionDeduper<string>();
    const factory = vi.fn(async () => "ok");

    const first = dedupe("same", factory);
    const second = dedupe("same", factory);

    expect(factory).toHaveBeenCalledTimes(1);

    await expect(first).resolves.toBe("ok");
    await expect(second).resolves.toBe("ok");
  });
});

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

describe("translation TTL cache (background)", () => {
  beforeEach(() => {
    installMockChromeStorage();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("caches successful responses within a short TTL (no second fetch)", async () => {
    const { local } = installMockChromeStorage();
    await updateTranslationSettings({ enabled: true, providerId: "gemini" });
    await setTranslationApiKey("gemini", "test-key");
    local.set.mockClear();

    const fetchMock = vi.fn(async () => makeGeminiResponse({ translatedWord: "你好", translatedDefinition: "问候语。" }));
    vi.stubGlobal("fetch", fetchMock);

    await handleTranslationRequest({ word: "hello-cache-hit", definition: "A greeting.", targetLang: "zh" });
    await handleTranslationRequest({ word: "hello-cache-hit", definition: "A greeting.", targetLang: "zh" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(local.set).toHaveBeenCalledTimes(2);
  });

  it("expires cached responses within 31 minutes", async () => {
    installMockChromeStorage();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));

    await updateTranslationSettings({ enabled: true, providerId: "gemini" });
    await setTranslationApiKey("gemini", "test-key");

    const fetchMock = vi.fn(async () => makeGeminiResponse({ translatedWord: "你好", translatedDefinition: "问候语。" }));
    vi.stubGlobal("fetch", fetchMock);

    await handleTranslationRequest({ word: "hello-ttl", definition: "A greeting.", targetLang: "zh" });

    vi.setSystemTime(new Date("2025-01-01T00:01:00Z"));
    await handleTranslationRequest({ word: "hello-ttl", definition: "A greeting.", targetLang: "zh" });

    vi.setSystemTime(new Date("2025-01-01T00:31:00Z"));
    await handleTranslationRequest({ word: "hello-ttl", definition: "A greeting.", targetLang: "zh" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not cache error responses", async () => {
    installMockChromeStorage();
    await updateTranslationSettings({ enabled: true, providerId: "gemini" });
    await setTranslationApiKey("gemini", "test-key");

    const fetchMock = vi.fn(async () => ({ ok: false, status: 429, text: async () => "" }) as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    await handleTranslationRequest({ word: "hello-no-cache", definition: null, targetLang: "zh" });
    await handleTranslationRequest({ word: "hello-no-cache", definition: null, targetLang: "zh" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
