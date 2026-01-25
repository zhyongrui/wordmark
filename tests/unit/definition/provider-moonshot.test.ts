import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { moonshotDefinitionProvider } from "../../../src/shared/definition/providers/moonshot";
import { clearMoonshotConfig, writeMoonshotConfig } from "../../../src/shared/translation/moonshot";

describe("moonshot definition provider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a sanitized short definition", async () => {
    await writeMoonshotConfig({
      endpointUrl: "https://api.moonshot.cn/v1/chat/completions",
      modelId: "moonshot-test-model"
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

    const response = await moonshotDefinitionProvider.generateDefinition(
      { word: "apple", sourceLang: "en" },
      "test-key"
    );

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.definitionText).toBe("A fruit.");
      expect(response.definitionLang).toBe("en");
    }
  });

  it("returns provider_error when config is missing", async () => {
    await clearMoonshotConfig();

    const response = await moonshotDefinitionProvider.generateDefinition(
      { word: "apple", sourceLang: "en" },
      "test-key"
    );

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("provider_error");
    }
  });

  it("maps HTTP 429 to quota_exceeded", async () => {
    await writeMoonshotConfig({
      endpointUrl: "https://api.moonshot.cn/v1/chat/completions",
      modelId: "moonshot-test-model"
    });

    const fetchMock = vi.fn(async () => ({ ok: false, status: 429 }) as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const response = await moonshotDefinitionProvider.generateDefinition(
      { word: "apple", sourceLang: "en" },
      "test-key"
    );

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("quota_exceeded");
    }
  });
});
