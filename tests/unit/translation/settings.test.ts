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

  it("defaults to enabled=true", async () => {
    const settings = await readTranslationSettings();
    expect(settings.enabled).toBe(true);
    expect(settings.mode).toBe("single");
    expect(settings.singleDirection).toBe("EN->ZH");
    expect(settings.dualPair).toBe("EN<->ZH");
    expect(settings.lastDirection).toBe("EN->ZH");
    expect(settings.definitionBackfillEnabled).toBe(false);
    expect(settings.definitionTranslationEnabled).toBe(false);
  });

  it("persists updates and round-trips", async () => {
    const next = await updateTranslationSettings({
      enabled: true,
      providerId: "gemini",
      mode: "dual",
      singleDirection: "ZH->EN",
      dualPair: "EN<->ZH",
      lastDirection: "ZH->EN",
      definitionBackfillEnabled: true,
      definitionTranslationEnabled: true
    });

    expect(next.enabled).toBe(true);
    expect(next.providerId).toBe("gemini");
    expect(next.mode).toBe("dual");
    expect(next.singleDirection).toBe("ZH->EN");
    expect(next.dualPair).toBe("EN<->ZH");
    expect(next.lastDirection).toBe("ZH->EN");
    expect(next.definitionBackfillEnabled).toBe(true);
    expect(next.definitionTranslationEnabled).toBe(true);

    const stored = await readTranslationSettings();
    expect(stored.enabled).toBe(true);
    expect(stored.providerId).toBe("gemini");
    expect(stored.mode).toBe("dual");
    expect(stored.singleDirection).toBe("ZH->EN");
    expect(stored.dualPair).toBe("EN<->ZH");
    expect(stored.lastDirection).toBe("ZH->EN");
    expect(stored.definitionBackfillEnabled).toBe(true);
    expect(stored.definitionTranslationEnabled).toBe(true);

    const chromeRef = globalThis as unknown as { chrome: { storage: { local: { set: ReturnType<typeof vi.fn> } } } };
    expect(chromeRef.chrome.storage.local.set).toHaveBeenCalled();
    expect(chromeRef.chrome.storage.local.set).toHaveBeenCalledWith({
      [TRANSLATION_SETTINGS_KEY]: expect.any(Object)
    });
  });

  it("supports Japanese directions in the saved settings", async () => {
    const next = await updateTranslationSettings({
      enabled: true,
      providerId: "gemini",
      mode: "single",
      singleDirection: "EN->JA",
      dualPair: "EN<->JA",
      lastDirection: "EN->JA",
      definitionBackfillEnabled: true,
      definitionTranslationEnabled: true
    });

    expect(next.singleDirection).toBe("EN->JA");
    expect(next.dualPair).toBe("EN<->JA");
    expect(next.lastDirection).toBe("EN->JA");

    const stored = await readTranslationSettings();
    expect(stored.singleDirection).toBe("EN->JA");
    expect(stored.dualPair).toBe("EN<->JA");
    expect(stored.lastDirection).toBe("EN->JA");
  });
});
