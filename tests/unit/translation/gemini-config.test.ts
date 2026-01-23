import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearGeminiConfig, getGeminiConfig, writeGeminiConfig } from "../../../src/shared/translation/gemini";

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

describe("gemini config helpers", () => {
  beforeEach(() => {
    installMockChromeStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when config is missing required fields", async () => {
    await clearGeminiConfig();
    expect(await getGeminiConfig()).toBeNull();
  });

  it("returns null for non-https endpoints", async () => {
    await writeGeminiConfig({
      endpointUrl: "http://generativelanguage.googleapis.com/v1beta",
      modelId: "gemini-2.5-flash"
    });
    expect(await getGeminiConfig()).toBeNull();
  });

  it("returns normalized config when valid", async () => {
    await writeGeminiConfig({
      endpointUrl: "https://generativelanguage.googleapis.com/v1beta/",
      modelId: "gemini-2.5-flash"
    });
    expect(await getGeminiConfig()).toEqual({
      endpointUrl: "https://generativelanguage.googleapis.com/v1beta",
      modelId: "gemini-2.5-flash"
    });
  });
});
