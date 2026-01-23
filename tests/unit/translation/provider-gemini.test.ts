import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { geminiProvider } from "../../../src/shared/translation/providers/gemini";
import { clearGeminiConfig, writeGeminiConfig } from "../../../src/shared/translation/gemini";

describe("gemini translation provider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(async () => {
    await clearGeminiConfig();
    vi.unstubAllGlobals();
  });

  it("sends minimal payload (word + optional definition only) and ignores extra fields", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = String(init?.body ?? "");
      expect(body).toContain("hello");
      expect(body).toContain("A greeting.");
      expect(body).not.toContain("SECRET_PAGE_CONTEXT");
      expect(init?.signal).toBeTruthy();

      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text:
                      "```json\n" +
                      JSON.stringify({
                        translatedWord: "你好",
                        translatedDefinition: "问候语。"
                      }) +
                      "\n```"
                  }
                ]
              }
            }
          ]
        })
      } as unknown as Response;
    });

    vi.stubGlobal("fetch", fetchMock);

    const response = await geminiProvider.translate(
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

  it("uses configured endpoint and model when override is saved", async () => {
    await writeGeminiConfig({
      endpointUrl: "https://proxy.example.com/v1beta",
      modelId: "gemini-test-model"
    });

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe(
        "https://proxy.example.com/v1beta/models/gemini-test-model:generateContent?key=test-key"
      );
      expect(init?.method).toBe("POST");

      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      translatedWord: "你好"
                    })
                  }
                ]
              }
            }
          ]
        })
      } as unknown as Response;
    });

    vi.stubGlobal("fetch", fetchMock);

    const response = await geminiProvider.translate(
      { word: "hello", definition: null, targetLang: "zh" },
      "test-key"
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.translatedWord).toBe("你好");
    }
  });

  it("maps offline errors to offline", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await geminiProvider.translate(
      { word: "hello", definition: null, targetLang: "zh" },
      "test-key"
    );

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("offline");
    }
  });

  it("maps HTTP 429 to quota_exceeded", async () => {
    const fetchMock = vi.fn(async () => {
      return { ok: false, status: 429 } as unknown as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await geminiProvider.translate(
      { word: "hello", definition: null, targetLang: "zh" },
      "test-key"
    );

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("quota_exceeded");
    }
  });

  it("maps AbortError to timeout", async () => {
    const fetchMock = vi.fn(async () => {
      throw Object.assign(new Error("aborted"), { name: "AbortError" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await geminiProvider.translate(
      { word: "hello", definition: null, targetLang: "zh" },
      "test-key"
    );

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("timeout");
    }
  });

  it("discovers a supported model via ListModels when all built-in models return 404", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/models?key=")) {
        expect(init?.method).toBe("GET");
        return {
          ok: true,
          status: 200,
          json: async () => ({
            models: [
              {
                name: "models/gemini-test-model",
                supportedGenerationMethods: ["generateContent"]
              }
            ]
          })
        } as unknown as Response;
      }

      if (url.includes("/models/gemini-test-model:generateContent")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        translatedWord: "你好"
                      })
                    }
                  ]
                }
              }
            ]
          })
        } as unknown as Response;
      }

      if (url.includes(":generateContent")) {
        return {
          ok: false,
          status: 404,
          text: async () =>
            JSON.stringify({
              error: { code: 404, message: "model not found", status: "NOT_FOUND" }
            })
        } as unknown as Response;
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const response = await geminiProvider.translate(
      { word: "hello", definition: null, targetLang: "zh" },
      "test-key"
    );

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.translatedWord).toBe("你好");
    }
  });
});
