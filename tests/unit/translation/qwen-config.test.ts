import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearQwenConfig, getQwenConfig, writeQwenConfig } from "../../../src/shared/translation/qwen";

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

describe("qwen config helpers", () => {
  beforeEach(() => {
    installMockChromeStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when config is missing required fields", async () => {
    await clearQwenConfig();
    expect(await getQwenConfig()).toBeNull();
  });

  it("returns null for non-https endpoints", async () => {
    await writeQwenConfig({ endpointUrl: "http://example.com/chat/completions", modelId: "qwen-plus" });
    expect(await getQwenConfig()).toBeNull();
  });

  it("returns normalized config when valid", async () => {
    await writeQwenConfig({
      endpointUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions/",
      modelId: "qwen-plus"
    });
    expect(await getQwenConfig()).toEqual({
      endpointUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      modelId: "qwen-plus"
    });
  });
});
