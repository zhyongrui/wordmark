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

  it("toggles hasApiKey and supports clear", async () => {
    expect(await hasTranslationApiKey()).toBe(false);
    expect(await getTranslationApiKey()).toBeNull();

    await setTranslationApiKey("gemini", "test-key");
    expect(await hasTranslationApiKey()).toBe(true);
    expect(await getTranslationApiKey()).toBe("test-key");

    const chromeRef = globalThis as unknown as { chrome: { storage: { local: { set: ReturnType<typeof vi.fn> } } } };
    expect(chromeRef.chrome.storage.local.set).toHaveBeenCalledWith({
      [TRANSLATION_SECRETS_KEY]: expect.any(Object)
    });

    await clearTranslationApiKey();
    expect(await hasTranslationApiKey()).toBe(false);
    expect(await getTranslationApiKey()).toBeNull();
  });
});

