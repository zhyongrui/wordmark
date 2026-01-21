import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { qwenProvider } from "../../../src/shared/translation/providers/qwen";
import { clearQwenConfig, writeQwenConfig } from "../../../src/shared/translation/qwen";

describe("qwen translation provider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends minimal payload (word + optional definition only) and parses JSON response", async () => {
    await writeQwenConfig({
      endpointUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      modelId: "qwen-plus"
    });

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = String(init?.body ?? "");
      expect(url).toBe("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions");
      expect(body).toContain("qwen-plus");
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
                  translatedWord: "\u4f60\u597d",
                  translatedDefinition: "\u95ee\u5019\u8bed\u3002"
                })
              }
            }
          ]
        })
      } as unknown as Response;
    });

    vi.stubGlobal("fetch", fetchMock);

    const response = await qwenProvider.translate(
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
      expect(response.translatedWord).toBe("\u4f60\u597d");
      expect(response.translatedDefinition).toBe("\u95ee\u5019\u8bed\u3002");
    }
  });

  it("returns not_configured when endpoint or model is missing", async () => {
    await clearQwenConfig();

    const response = await qwenProvider.translate({ word: "hello", definition: null, targetLang: "zh" }, "test-key");

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("not_configured");
    }
  });

  it("maps offline errors to offline", async () => {
    await writeQwenConfig({
      endpointUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      modelId: "qwen-plus"
    });

    const fetchMock = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await qwenProvider.translate({ word: "hello", definition: null, targetLang: "zh" }, "test-key");

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("offline");
    }
  });

  it("maps HTTP 429 to quota_exceeded", async () => {
    await writeQwenConfig({
      endpointUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      modelId: "qwen-plus"
    });

    const fetchMock = vi.fn(async () => {
      return { ok: false, status: 429 } as unknown as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await qwenProvider.translate({ word: "hello", definition: null, targetLang: "zh" }, "test-key");

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("quota_exceeded");
    }
  });

  it("maps AbortError to timeout", async () => {
    await writeQwenConfig({
      endpointUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      modelId: "qwen-plus"
    });

    const fetchMock = vi.fn(async () => {
      throw Object.assign(new Error("aborted"), { name: "AbortError" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await qwenProvider.translate({ word: "hello", definition: null, targetLang: "zh" }, "test-key");

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("timeout");
    }
  });
});
