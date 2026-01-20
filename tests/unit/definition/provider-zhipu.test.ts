import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { zhipuDefinitionProvider } from "../../../src/shared/definition/providers/zhipu";
import { clearZhipuConfig, writeZhipuConfig } from "../../../src/shared/translation/zhipu";

describe("zhipu definition provider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a sanitized short definition", async () => {
    await writeZhipuConfig({
      endpointUrl: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      modelId: "glm-4.7"
    });

    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = String(init?.body ?? "");
      expect(body).toContain("Word: apple");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: "\"A fruit.\""
              }
            }
          ]
        })
      } as unknown as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await zhipuDefinitionProvider.generateDefinition({ word: "apple" }, "test-key");

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.definitionEn).toBe("A fruit.");
    }
  });

  it("returns provider_error when config is missing", async () => {
    await clearZhipuConfig();

    const response = await zhipuDefinitionProvider.generateDefinition({ word: "apple" }, "test-key");

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("provider_error");
    }
  });

  it("maps HTTP 429 to quota_exceeded", async () => {
    await writeZhipuConfig({
      endpointUrl: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      modelId: "glm-4.7"
    });

    const fetchMock = vi.fn(async () => ({ ok: false, status: 429 }) as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const response = await zhipuDefinitionProvider.generateDefinition({ word: "apple" }, "test-key");

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("quota_exceeded");
    }
  });
});
