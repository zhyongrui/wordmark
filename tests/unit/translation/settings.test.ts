import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  readTranslationSettings,
  TRANSLATION_SETTINGS_KEY,
  updateTranslationSettings
} from "../../../src/shared/translation/settings";

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

describe("translation settings", () => {
  beforeEach(() => {
    installMockChromeStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to enabled=false", async () => {
    const settings = await readTranslationSettings();
    expect(settings.enabled).toBe(false);
  });

  it("persists updates and round-trips", async () => {
    const next = await updateTranslationSettings({ enabled: true, providerId: "gemini" });

    expect(next.enabled).toBe(true);
    expect(next.providerId).toBe("gemini");

    const stored = await readTranslationSettings();
    expect(stored.enabled).toBe(true);
    expect(stored.providerId).toBe("gemini");

    const chromeRef = globalThis as unknown as { chrome: { storage: { local: { set: ReturnType<typeof vi.fn> } } } };
    expect(chromeRef.chrome.storage.local.set).toHaveBeenCalled();
    expect(chromeRef.chrome.storage.local.set).toHaveBeenCalledWith({
      [TRANSLATION_SETTINGS_KEY]: expect.any(Object)
    });
  });
});

