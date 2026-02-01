import {
  createDefinitionError,
  mapHttpStatusToDefinitionErrorCode,
  mapUnknownErrorToDefinitionErrorCode,
  type DefinitionRequest,
  type DefinitionResponse
} from "../types";
import { sanitizeChineseDefinitionText, sanitizeEnglishDefinitionText, sanitizeJapaneseDefinitionText } from "../sanitize";
import { getGeminiConfig } from "../../translation/gemini";
import type { DefinitionProvider } from "./provider";

const DEFAULT_TIMEOUT_MS = 20000;
const GEMINI_BASE_URLS = [
  "https://generativelanguage.googleapis.com/v1beta",
  "https://generativelanguage.googleapis.com/v1"
] as const;
const DEFAULT_MODEL_ID = "gemini-2.5-flash" as const;
const GEMINI_MODEL_IDS = [
  DEFAULT_MODEL_ID,
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-pro",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro",
  "gemini-1.5-pro-latest",
  "gemini-pro"
] as const;

let cachedModelSelection: { baseUrl: string; modelId: string } | null = null;

const toEndpointLabel = (baseUrl: string, modelId: string): string => {
  try {
    const url = new URL(baseUrl);
    const version = url.pathname.replace(/^\//, "");
    return `${version}/models/${modelId}:generateContent`;
  } catch {
    return `models/${modelId}:generateContent`;
  }
};

const extractModelIdsFromListModelsResponse = (input: unknown): string[] => {
  if (!input || typeof input !== "object") {
    return [];
  }

  const modelsRaw = (input as { models?: unknown }).models;
  if (!Array.isArray(modelsRaw)) {
    return [];
  }

  const ids: string[] = [];
  for (const model of modelsRaw) {
    if (!model || typeof model !== "object") {
      continue;
    }

    const nameRaw = (model as { name?: unknown }).name;
    const methodsRaw = (model as { supportedGenerationMethods?: unknown }).supportedGenerationMethods;
    if (typeof nameRaw !== "string" || !Array.isArray(methodsRaw)) {
      continue;
    }

    const supported = methodsRaw.some((method) => typeof method === "string" && method === "generateContent");
    if (!supported) {
      continue;
    }

    const id = nameRaw.replace(/^models\//, "").trim();
    if (!id) {
      continue;
    }

    ids.push(id);
  }

  return ids;
};

const pickPreferredModelId = (modelIds: string[]): string | null => {
  if (!modelIds.length) {
    return null;
  }

  for (const preferred of GEMINI_MODEL_IDS) {
    const found =
      modelIds.find((candidate) => candidate === preferred || candidate.startsWith(`${preferred}-`)) ?? null;
    if (found) {
      return found;
    }
  }

  const withoutVision = modelIds.filter((candidate) => !candidate.toLowerCase().includes("vision"));
  const candidates = withoutVision.length ? withoutVision : modelIds;

  const flash = candidates.find((candidate) => candidate.toLowerCase().includes("flash")) ?? null;
  if (flash) {
    return flash;
  }

  const pro = candidates.find((candidate) => candidate.toLowerCase().includes("pro")) ?? null;
  if (pro) {
    return pro;
  }

  return candidates[0] ?? null;
};

const readErrorSnippet = async (response: Response): Promise<string | null> => {
  try {
    const text = await response.text();
    const normalized = text.trim().replace(/\s+/g, " ");
    if (!normalized) {
      return null;
    }
    return normalized.slice(0, 240);
  } catch {
    return null;
  }
};

const extractText = async (response: Response): Promise<string | null> => {
  try {
    const data: unknown = await response.json();
    const text =
      typeof data === "object" &&
      data != null &&
      "candidates" in data &&
      Array.isArray((data as { candidates?: unknown }).candidates)
        ? (data as { candidates: unknown[] }).candidates[0]
        : null;

    const parts =
      text && typeof text === "object" && "content" in text ? (text as { content?: unknown }).content : null;

    const contentParts = parts && typeof parts === "object" && "parts" in parts ? (parts as { parts?: unknown }).parts : null;

    const firstPart = Array.isArray(contentParts) ? contentParts[0] : null;
    const candidateText =
      firstPart && typeof firstPart === "object" && "text" in firstPart ? (firstPart as { text?: unknown }).text : null;

    return typeof candidateText === "string" ? candidateText : null;
  } catch {
    return null;
  }
};

const attachAbortSignal = (controller: AbortController, upstreamSignal: AbortSignal | undefined): (() => void) | null => {
  if (!upstreamSignal) {
    return null;
  }

  if (upstreamSignal.aborted) {
    controller.abort();
    return null;
  }

  const onAbort = () => controller.abort();
  upstreamSignal.addEventListener("abort", onAbort, { once: true });
  return () => upstreamSignal.removeEventListener("abort", onAbort);
};

const buildPrompt = (request: DefinitionRequest): string => {
  const languageLabel = request.sourceLang === "zh" ? "Chinese" : request.sourceLang === "ja" ? "Japanese" : "English";
  return [
    `Write a short ${languageLabel} dictionary-style definition for the given word.`,
    "Constraints:",
    "- Plain text only (no Markdown, no code fences).",
    "- 1–2 sentences.",
    "- Maximum 240 characters.",
    ...(request.sourceLang === "ja" ? ["- Use Japanese only (no English), prefer natural Japanese, no romaji."] : []),
    "",
    `Word: ${request.word}`
  ].join("\n");
};

export const geminiDefinitionProvider: DefinitionProvider = {
  id: "gemini",
  generateDefinition: async (
    request: DefinitionRequest,
    apiKey: string,
    options?: { signal?: AbortSignal }
  ): Promise<DefinitionResponse> => {
    const word = typeof request.word === "string" ? request.word.trim() : "";
    if (!word) {
      return createDefinitionError("provider_error", "Definition unavailable (invalid word).");
    }

    const controller = new AbortController();
    const detachAbort = attachAbortSignal(controller, options?.signal);
    const timeoutId = globalThis.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const prompt = buildPrompt({ word, sourceLang: request.sourceLang });
      const requestBody = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 }
      });

      let lastHttpStatus: number | null = null;
      let lastEndpoint: string | null = null;
      let lastErrorSnippet: string | null = null;

      const callGenerateContent = async (
        baseUrl: string,
        modelId: string,
        options?: { cache?: boolean }
      ): Promise<DefinitionResponse | "not_found"> => {
        const url = `${baseUrl}/models/${modelId}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const endpointLabel = toEndpointLabel(baseUrl, modelId);

        const response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: requestBody,
          signal: controller.signal
        });

        if (!response.ok) {
          lastHttpStatus = response.status;
          lastEndpoint = endpointLabel;
          lastErrorSnippet = await readErrorSnippet(response);
          if (response.status === 404) {
            return "not_found";
          }

          const errorCode = mapHttpStatusToDefinitionErrorCode(response.status);
          const details = lastErrorSnippet ? ` Details: ${lastErrorSnippet}` : "";
          return createDefinitionError(
            errorCode,
            `Definition unavailable (HTTP ${response.status}) via ${endpointLabel}.${details} Check API key and API access.`
          );
        }

        const candidate = await extractText(response);
        if (!candidate) {
          return createDefinitionError("provider_error", "Definition unavailable (unexpected provider response).");
        }

        const sanitized =
          request.sourceLang === "zh"
            ? sanitizeChineseDefinitionText(candidate, { maxChars: 240 })
            : request.sourceLang === "ja"
              ? sanitizeJapaneseDefinitionText(candidate, { maxChars: 240 })
              : sanitizeEnglishDefinitionText(candidate, { maxChars: 240 });
        if (!sanitized) {
          return createDefinitionError("provider_error", "Definition unavailable (empty provider response).");
        }

        if (options?.cache !== false) {
          cachedModelSelection = { baseUrl, modelId };
        }
        return { ok: true, definitionText: sanitized, definitionLang: request.sourceLang };
      };

      const overrideConfig = await getGeminiConfig();
      if (overrideConfig) {
        const overrideAttempt = await callGenerateContent(
          overrideConfig.endpointUrl,
          overrideConfig.modelId,
          { cache: false }
        );
        if (overrideAttempt === "not_found") {
          const endpoint = lastEndpoint ? ` via ${lastEndpoint}` : "";
          const details = lastErrorSnippet ? ` Details: ${lastErrorSnippet}` : "";
          return createDefinitionError(
            "provider_error",
            `Definition unavailable (HTTP ${lastHttpStatus ?? 404})${endpoint}.${details} Check API key, model ID, and API access.`
          );
        }
        return overrideAttempt;
      }

      const cached = cachedModelSelection;
      if (cached) {
        const cachedAttempt = await callGenerateContent(cached.baseUrl, cached.modelId);
        if (cachedAttempt !== "not_found") {
          return cachedAttempt;
        }
        cachedModelSelection = null;
      }

      for (const baseUrl of GEMINI_BASE_URLS) {
        const attempt = await callGenerateContent(baseUrl, DEFAULT_MODEL_ID);
        if (attempt === "not_found") {
          continue;
        }
        return attempt;
      }

      const discoverModel = async (baseUrl: string): Promise<string | null> => {
        const url = `${baseUrl}/models?key=${encodeURIComponent(apiKey)}`;
        const response = await fetch(url, { method: "GET", signal: controller.signal });
        if (!response.ok) {
          lastHttpStatus = response.status;
          lastEndpoint = `${new URL(baseUrl).pathname.replace(/^\//, "")}/models`;
          lastErrorSnippet = await readErrorSnippet(response);
          return null;
        }

        const data: unknown = await response.json().catch(() => null);
        const modelIds = extractModelIdsFromListModelsResponse(data);
        return pickPreferredModelId(modelIds);
      };

      for (const baseUrl of GEMINI_BASE_URLS) {
        const discovered = await discoverModel(baseUrl);
        if (!discovered) {
          continue;
        }

        const attempt = await callGenerateContent(baseUrl, discovered);
        if (attempt === "not_found") {
          continue;
        }
        return attempt;
      }

      const fallbackModelIds = Array.from(GEMINI_MODEL_IDS).filter((modelId) => modelId !== DEFAULT_MODEL_ID);
      for (const baseUrl of GEMINI_BASE_URLS) {
        for (const modelId of fallbackModelIds) {
          const attempt = await callGenerateContent(baseUrl, modelId);
          if (attempt === "not_found") {
            continue;
          }
          return attempt;
        }
      }

      if (lastHttpStatus != null) {
        const endpoint = lastEndpoint ? ` via ${lastEndpoint}` : "";
        const details = lastErrorSnippet ? ` Details: ${lastErrorSnippet}` : "";
        return createDefinitionError(
          "provider_error",
          `Definition unavailable (HTTP ${lastHttpStatus})${endpoint}.${details} Check API key and API access.`
        );
      }

      return createDefinitionError(
        "provider_error",
        "Definition unavailable. The configured API key may not have access to any Gemini model that supports generateContent."
      );
    } catch (error) {
      return createDefinitionError(mapUnknownErrorToDefinitionErrorCode(error));
    } finally {
      globalThis.clearTimeout(timeoutId);
      detachAbort?.();
    }
  }
};
