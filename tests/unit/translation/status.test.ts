import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setTranslationApiKey, clearTranslationApiKey } from "../../../src/shared/translation/secrets";
import { updateTranslationSettings } from "../../../src/shared/translation/settings";
import { getTranslationAvailability } from "../../../src/shared/translation/status";
import { writeMoonshotConfig, clearMoonshotConfig } from "../../../src/shared/translation/moonshot";
import { writeOpenAIConfig, clearOpenAIConfig } from "../../../src/shared/translation/openai";
import { writeVolcengineConfig, clearVolcengineConfig } from "../../../src/shared/translation/volcengine";
import { writeZhipuConfig, clearZhipuConfig } from "../../../src/shared/translation/zhipu";

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

  it("reports configured=false when Moonshot is selected without endpoint config", async () => {
    await clearMoonshotConfig();
    await updateTranslationSettings({ enabled: true, providerId: "moonshot" });
    await setTranslationApiKey("moonshot", "test-key");

    const status = await getTranslationAvailability();
    expect(status).toEqual({ enabled: true, configured: false });
  });

  it("reports configured=true when Moonshot is selected with endpoint config", async () => {
    await updateTranslationSettings({ enabled: true, providerId: "moonshot" });
    await setTranslationApiKey("moonshot", "test-key");
    await writeMoonshotConfig({
      endpointUrl: "https://api.moonshot.cn/v1/chat/completions",
      modelId: "moonshot-test-model"
    });

    const status = await getTranslationAvailability();
    expect(status).toEqual({ enabled: true, configured: true });
  });

  it("reports configured=false when OpenAI is selected without endpoint config", async () => {
    await clearOpenAIConfig();
    await updateTranslationSettings({ enabled: true, providerId: "openai" });
    await setTranslationApiKey("openai", "test-key");

    const status = await getTranslationAvailability();
    expect(status).toEqual({ enabled: true, configured: false });
  });

  it("reports configured=true when OpenAI is selected with endpoint config", async () => {
    await updateTranslationSettings({ enabled: true, providerId: "openai" });
    await setTranslationApiKey("openai", "test-key");
    await writeOpenAIConfig({
      endpointUrl: "https://api.openai.com/v1/chat/completions",
      modelId: "gpt-4.1-mini"
    });

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

  it("reports configured=false when Zhipu is selected without endpoint config", async () => {
    await clearZhipuConfig();
    await updateTranslationSettings({ enabled: true, providerId: "zhipu" });
    await setTranslationApiKey("zhipu", "test-key");

    const status = await getTranslationAvailability();
    expect(status).toEqual({ enabled: true, configured: false });
  });

  it("reports configured=true when Zhipu is selected with endpoint config", async () => {
    await updateTranslationSettings({ enabled: true, providerId: "zhipu" });
    await setTranslationApiKey("zhipu", "test-key");
    await writeZhipuConfig({
      endpointUrl: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      modelId: "glm-4.7"
    });

    const status = await getTranslationAvailability();
    expect(status).toEqual({ enabled: true, configured: true });
  });
});
