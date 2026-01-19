import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setTranslationApiKey, clearTranslationApiKey } from "../../../src/shared/translation/secrets";
import { updateTranslationSettings } from "../../../src/shared/translation/settings";
import { getTranslationAvailability } from "../../../src/shared/translation/status";
import { writeVolcengineConfig, clearVolcengineConfig } from "../../../src/shared/translation/volcengine";

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

describe("translation availability helper", () => {
  beforeEach(() => {
    installMockChromeStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports enabled=false and configured=false by default", async () => {
    const status = await getTranslationAvailability();
    expect(status).toEqual({ enabled: false, configured: false });
  });

  it("reports configured=false when enabled but no API key", async () => {
    await clearTranslationApiKey();
    await updateTranslationSettings({ enabled: true, providerId: "gemini" });

    const status = await getTranslationAvailability();
    expect(status).toEqual({ enabled: true, configured: false });
  });

  it("reports configured=true when enabled and API key is present", async () => {
    await updateTranslationSettings({ enabled: true, providerId: "gemini" });
    await setTranslationApiKey("gemini", "test-key");

    const status = await getTranslationAvailability();
    expect(status).toEqual({ enabled: true, configured: true });
  });

  it("reports configured=false when Volcengine is selected without endpoint config", async () => {
    await clearVolcengineConfig();
    await updateTranslationSettings({ enabled: true, providerId: "volcengine" });
    await setTranslationApiKey("volcengine", "test-key");

    const status = await getTranslationAvailability();
    expect(status).toEqual({ enabled: true, configured: false });
  });

  it("reports configured=true when Volcengine is selected with endpoint config", async () => {
    await updateTranslationSettings({ enabled: true, providerId: "volcengine" });
    await setTranslationApiKey("volcengine", "test-key");
    await writeVolcengineConfig({
      endpointUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
      modelId: "volcengine-test-model"
    });

    const status = await getTranslationAvailability();
    expect(status).toEqual({ enabled: true, configured: true });
  });
});
