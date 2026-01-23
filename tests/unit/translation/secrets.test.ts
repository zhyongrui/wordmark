import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearTranslationApiKey,
  getTranslationApiKey,
  hasTranslationApiKey,
  setTranslationApiKey,
  TRANSLATION_SECRETS_KEY
} from "../../../src/shared/translation/secrets";

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

describe("translation secrets", () => {
  beforeEach(() => {
    installMockChromeStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores keys per provider and clears only the selected provider", async () => {
    expect(await hasTranslationApiKey("gemini")).toBe(false);
    expect(await getTranslationApiKey("gemini")).toBeNull();

    await setTranslationApiKey("gemini", "test-key");
    await setTranslationApiKey("deepseek", "deepseek-key");
    expect(await hasTranslationApiKey("gemini")).toBe(true);
    expect(await getTranslationApiKey("gemini")).toBe("test-key");
    expect(await hasTranslationApiKey("deepseek")).toBe(true);
    expect(await getTranslationApiKey("deepseek")).toBe("deepseek-key");

    const chromeRef = globalThis as unknown as { chrome: { storage: { local: { set: ReturnType<typeof vi.fn> } } } };
    expect(chromeRef.chrome.storage.local.set).toHaveBeenCalledWith({
      [TRANSLATION_SECRETS_KEY]: expect.any(Object)
    });

    await clearTranslationApiKey("gemini");
    expect(await hasTranslationApiKey("gemini")).toBe(false);
    expect(await getTranslationApiKey("gemini")).toBeNull();
    expect(await hasTranslationApiKey("deepseek")).toBe(true);
    expect(await getTranslationApiKey("deepseek")).toBe("deepseek-key");
  });

  it("migrates legacy secrets format into provider-scoped keys", async () => {
    const chromeRef = globalThis as unknown as {
      chrome: {
        storage: { local: { set: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> } };
      };
    };

    const legacyPayload = {
      [TRANSLATION_SECRETS_KEY]: {
        providerId: "gemini",
        apiKey: "legacy-key",
        updatedAt: "2024-01-01T00:00:00.000Z"
      }
    };
    await chromeRef.chrome.storage.local.set(legacyPayload);

    expect(await getTranslationApiKey("gemini")).toBe("legacy-key");
    const setCalls = chromeRef.chrome.storage.local.set.mock.calls;
    const migratedCall = setCalls.find((call) => {
      const payload = call[0]?.[TRANSLATION_SECRETS_KEY];
      return payload && typeof payload === "object" && "keys" in payload;
    });
    expect(migratedCall).toBeTruthy();
  });
});
