import {
  createTranslationError,
  mapHttpStatusToTranslationErrorCode,
  mapUnknownErrorToTranslationErrorCode,
  type TranslationRequest,
  type TranslationResponse
} from "../types";
import { getGeminiConfig } from "../gemini";
import type { TranslationProvider } from "./provider";
import { getLanguageDisplayName } from "../directions";

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

const buildPrompt = (request: TranslationRequest): string => {
  const definitionText =
    typeof request.definition === "string" && request.definition.trim()
      ? request.definition.trim()
      : null;

  const placeholder = `<${request.targetLang}>`;
  const schema =
    definitionText == null
      ? `{"translatedWord":"${placeholder}"}`
      : `{"translatedWord":"${placeholder}","translatedDefinition":"${placeholder}"}`;

  return [
    `Translate the following ${getLanguageDisplayName(request.sourceLang)} content into ${getLanguageDisplayName(
      request.targetLang
    )}.`,
    `Return ONLY a valid JSON object matching this schema exactly: ${schema}`,
    "Do not wrap the JSON in Markdown code fences.",
    "Do not include any additional keys.",
    "",
    `Word: ${request.word}`,
    definitionText == null ? "" : `Definition: ${definitionText}`
  ]
    .filter(Boolean)
    .join("\n");
};

const extractJsonText = async (response: Response): Promise<string | null> => {
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
      text && typeof text === "object" && "content" in text
        ? (text as { content?: unknown }).content
        : null;

    const contentParts =
      parts && typeof parts === "object" && "parts" in parts ? (parts as { parts?: unknown }).parts : null;

    const firstPart = Array.isArray(contentParts) ? contentParts[0] : null;
    const candidateText =
      firstPart && typeof firstPart === "object" && "text" in firstPart
        ? (firstPart as { text?: unknown }).text
        : null;

    return typeof candidateText === "string" ? candidateText : null;
  } catch {
    return null;
  }
};

const parseTranslation = (text: string): { translatedWord: string; translatedDefinition?: string | null } | null => {
  const attempt = (candidate: string) => {
    const parsed: unknown = JSON.parse(candidate);
    const translatedWordRaw =
      parsed && typeof parsed === "object" && "translatedWord" in parsed
        ? (parsed as { translatedWord?: unknown }).translatedWord
        : null;
    if (typeof translatedWordRaw !== "string" || !translatedWordRaw.trim()) {
      return null;
    }

    const translatedDefinitionRaw =
      parsed && typeof parsed === "object" && "translatedDefinition" in parsed
        ? (parsed as { translatedDefinition?: unknown }).translatedDefinition
        : null;

    return {
      translatedWord: translatedWordRaw,
      translatedDefinition: typeof translatedDefinitionRaw === "string" ? translatedDefinitionRaw : null
    };
  };

  try {
    return attempt(text);
  } catch {
    // continue
  }

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    try {
      return attempt(fenced[1]);
    } catch {
      // continue
    }
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const slice = text.slice(firstBrace, lastBrace + 1);
    try {
      return attempt(slice);
    } catch {
      // continue
    }
  }

  return null;
};

const attachAbortSignal = (
  controller: AbortController,
  upstreamSignal: AbortSignal | undefined
): (() => void) | null => {
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

export const geminiProvider: TranslationProvider = {
  id: "gemini",
  translate: async (
    request: TranslationRequest,
    apiKey: string,
    options?: { signal?: AbortSignal }
  ): Promise<TranslationResponse> => {
    const { word, definition, targetLang, sourceLang } = request;
    if (targetLang !== "zh" && targetLang !== "en" && targetLang !== "ja") {
      return createTranslationError("provider_error");
    }

    const minimalRequest: TranslationRequest = {
      word,
      definition: typeof definition === "string" ? definition : null,
      sourceLang,
      targetLang
    };

    const controller = new AbortController();
    const detachAbort = attachAbortSignal(controller, options?.signal);
    const timeoutId = globalThis.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const prompt = buildPrompt(minimalRequest);
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
      ): Promise<TranslationResponse | "not_found"> => {
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

          const errorCode = mapHttpStatusToTranslationErrorCode(response.status);
          const details = lastErrorSnippet ? ` Details: ${lastErrorSnippet}` : "";
          return createTranslationError(
            errorCode,
            `Translation unavailable (HTTP ${response.status}) via ${endpointLabel}.${details} Check API key and API access.`
          );
        }

        const candidate = await extractJsonText(response);
        if (!candidate) {
          return createTranslationError("provider_error", "Translation unavailable (unexpected provider response).");
        }

        const parsed = parseTranslation(candidate);
        if (!parsed) {
          return createTranslationError("provider_error", "Translation unavailable (unexpected provider response).");
        }

        if (options?.cache !== false) {
          cachedModelSelection = { baseUrl, modelId };
        }
        return {
          ok: true,
          translatedWord: parsed.translatedWord,
          translatedDefinition: parsed.translatedDefinition ?? null
        };
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
          return createTranslationError(
            "provider_error",
            `Translation unavailable (HTTP ${lastHttpStatus ?? 404})${endpoint}.${details} Check API key, model ID, and API access.`
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
        return createTranslationError(
          "provider_error",
          `Translation unavailable (HTTP ${lastHttpStatus})${endpoint}.${details} Check API key and API access.`
        );
      }

      return createTranslationError(
        "provider_error",
        "Translation unavailable. The configured API key may not have access to any Gemini model that supports generateContent."
      );
    } catch (error) {
      return createTranslationError(mapUnknownErrorToTranslationErrorCode(error));
    } finally {
      globalThis.clearTimeout(timeoutId);
      detachAbort?.();
    }
  }
};
