import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { zhipuProvider } from "../../../src/shared/translation/providers/zhipu";
import { clearZhipuConfig, writeZhipuConfig } from "../../../src/shared/translation/zhipu";

describe("zhipu translation provider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends minimal payload (word + optional definition only) and parses JSON response", async () => {
    await writeZhipuConfig({
      endpointUrl: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      modelId: "glm-4.7"
    });

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = String(init?.body ?? "");
      expect(url).toBe("https://open.bigmodel.cn/api/paas/v4/chat/completions");
      expect(body).toContain("glm-4.7");
      expect(body).toContain("hello");
      expect(body).toContain("A greeting.");
      expect(body).not.toContain("SECRET_PAGE_CONTEXT");
      expect(init?.signal).toBeTruthy();

      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer test-key");

      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  translatedWord: "你好",
                  translatedDefinition: "问候语。"
                })
              }
            }
          ]
        })
      } as unknown as Response;
    });

    vi.stubGlobal("fetch", fetchMock);

    const response = await zhipuProvider.translate(
      {
        word: "hello",
        definition: "A greeting.",
        targetLang: "zh",
        pageContext: "SECRET_PAGE_CONTEXT"
      } as unknown as {
        word: string;
        definition: string;
        targetLang: "zh";
      },
      "test-key"
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.translatedWord).toBe("你好");
      expect(response.translatedDefinition).toBe("问候语。");
    }
  });

  it("returns not_configured when endpoint or model is missing", async () => {
    await clearZhipuConfig();

    const response = await zhipuProvider.translate(
      { word: "hello", definition: null, targetLang: "zh" },
      "test-key"
    );

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("not_configured");
    }
  });

  it("maps offline errors to offline", async () => {
    await writeZhipuConfig({
      endpointUrl: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      modelId: "glm-4.7"
    });

    const fetchMock = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await zhipuProvider.translate(
      { word: "hello", definition: null, targetLang: "zh" },
      "test-key"
    );

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("offline");
    }
  });

  it("maps HTTP 429 to quota_exceeded", async () => {
    await writeZhipuConfig({
      endpointUrl: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      modelId: "glm-4.7"
    });

    const fetchMock = vi.fn(async () => {
      return { ok: false, status: 429 } as unknown as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await zhipuProvider.translate(
      { word: "hello", definition: null, targetLang: "zh" },
      "test-key"
    );

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("quota_exceeded");
    }
  });

  it("maps AbortError to timeout", async () => {
    await writeZhipuConfig({
      endpointUrl: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      modelId: "glm-4.7"
    });

    const fetchMock = vi.fn(async () => {
      throw Object.assign(new Error("aborted"), { name: "AbortError" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await zhipuProvider.translate(
      { word: "hello", definition: null, targetLang: "zh" },
      "test-key"
    );

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("timeout");
    }
  });
});
