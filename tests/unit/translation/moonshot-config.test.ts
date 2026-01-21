import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearMoonshotConfig,
  getMoonshotConfig,
  normalizeMoonshotEndpointUrl,
  writeMoonshotConfig
} from "../../../src/shared/translation/moonshot";

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

describe("moonshot config helpers", () => {
  beforeEach(() => {
    installMockChromeStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes endpoint URLs by trimming trailing slashes", () => {
    expect(normalizeMoonshotEndpointUrl(" https://example.com/// ")).toBe("https://example.com");
  });

  it("returns null when config is missing required fields", async () => {
    await clearMoonshotConfig();
    expect(await getMoonshotConfig()).toBeNull();
  });

  it("returns null for non-https endpoints", async () => {
    await writeMoonshotConfig({ endpointUrl: "http://example.com/v1/chat/completions", modelId: "k" });
    expect(await getMoonshotConfig()).toBeNull();
  });

  it("returns normalized config when valid", async () => {
    await writeMoonshotConfig({
      endpointUrl: "https://example.com/v1/chat/completions/",
      modelId: "moonshot-test-model"
    });
    expect(await getMoonshotConfig()).toEqual({
      endpointUrl: "https://example.com/v1/chat/completions",
      modelId: "moonshot-test-model"
    });
  });
});

