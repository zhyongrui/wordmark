import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleListWords } from "../../../src/background/handlers/words";
import { recordLookup, __resetMemoryStore, readStore } from "../../../src/shared/word/store";
import { setTranslationApiKey } from "../../../src/shared/translation/secrets";
import { updateTranslationSettings } from "../../../src/shared/translation/settings";
import { handleTranslationRequest } from "../../../src/background/handlers/translation";

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

describe("list words includes wordZh when stored", () => {
  beforeEach(() => {
    __resetMemoryStore();
    installMockChromeStorage();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns word entries with wordZh after a successful translation writes it", async () => {
    await recordLookup({
      normalizedWord: "hello",
      displayWord: "Hello",
      definition: "A greeting.",
      pronunciationAvailable: false
    });

    await updateTranslationSettings({ enabled: true, providerId: "gemini" });
    await setTranslationApiKey("gemini", "test-key");

    vi.stubGlobal("fetch", vi.fn(async () => makeGeminiResponse({ translatedWord: "你好" })));
    await handleTranslationRequest({ word: "hello", definition: null, targetLang: "zh" });

    const response = await handleListWords();
    expect(response.ok).toBe(true);
    if (!response.ok) {
      return;
    }

    const stored = response.words.find((entry) => entry.normalizedWord === "hello");
    expect(stored).toBeTruthy();
    expect((stored as unknown as { wordZh?: string }).wordZh).toBe("你好");

    const store = await readStore();
    expect((store.wordsByKey.hello as unknown as { wordZh?: string }).wordZh).toBe("你好");
  });
});

