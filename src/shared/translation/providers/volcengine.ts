import {
  createTranslationError,
  mapHttpStatusToTranslationErrorCode,
  mapUnknownErrorToTranslationErrorCode,
  type TranslationRequest,
  type TranslationResponse
} from "../types";
import { getVolcengineConfig } from "../volcengine";
import type { TranslationProvider } from "./provider";
import { getLanguageDisplayName } from "../directions";

const DEFAULT_TIMEOUT_MS = 20000;

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

const buildSystemPrompt = (request: TranslationRequest): string => {
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
    "Do not include any additional keys."
  ].join("\n");
};

const buildUserPrompt = (request: TranslationRequest): string => {
  const definitionText =
    typeof request.definition === "string" && request.definition.trim()
      ? request.definition.trim()
      : null;

  return [
    `Word: ${request.word}`,
    definitionText == null ? "" : `Definition: ${definitionText}`
  ]
    .filter(Boolean)
    .join("\n");
};

const extractMessageContent = async (response: Response): Promise<string | null> => {
  try {
    const data: unknown = await response.json();
    const choices =
      typeof data === "object" && data != null && "choices" in data
        ? (data as { choices?: unknown }).choices
        : null;
    if (!Array.isArray(choices) || !choices.length) {
      return null;
    }

    const message =
      choices[0] && typeof choices[0] === "object" && "message" in choices[0]
        ? (choices[0] as { message?: unknown }).message
        : null;
    const content =
      message && typeof message === "object" && "content" in message
        ? (message as { content?: unknown }).content
        : null;

    return typeof content === "string" ? content : null;
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

export const volcengineProvider: TranslationProvider = {
  id: "volcengine",
  translate: async (
    request: TranslationRequest,
    apiKey: string,
    options?: { signal?: AbortSignal }
  ): Promise<TranslationResponse> => {
    const { word, definition, sourceLang, targetLang } = request;
    if (targetLang !== "zh" && targetLang !== "en" && targetLang !== "ja") {
      return createTranslationError("provider_error");
    }

    const config = await getVolcengineConfig();
    if (!config) {
      return createTranslationError("not_configured");
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
      const requestBody = JSON.stringify({
        model: config.modelId,
        messages: [
          { role: "system", content: buildSystemPrompt(minimalRequest) },
          { role: "user", content: buildUserPrompt(minimalRequest) }
        ],
        temperature: 0.2
      });

      const response = await fetch(config.endpointUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: requestBody,
        signal: controller.signal
      });

      if (!response.ok) {
        const errorCode = mapHttpStatusToTranslationErrorCode(response.status);
        const snippet = await readErrorSnippet(response);
        const details = snippet ? ` Details: ${snippet}` : "";
        return createTranslationError(
          errorCode,
          `Translation unavailable (HTTP ${response.status}) via Volcengine.${details}`
        );
      }

      const candidate = await extractMessageContent(response);
      if (!candidate) {
        return createTranslationError("provider_error", "Translation unavailable (unexpected provider response).");
      }

      const parsed = parseTranslation(candidate);
      if (!parsed) {
        return createTranslationError("provider_error", "Translation unavailable (unexpected provider response).");
      }

      return {
        ok: true,
        translatedWord: parsed.translatedWord,
        translatedDefinition: parsed.translatedDefinition ?? null
      };
    } catch (error) {
      return createTranslationError(mapUnknownErrorToTranslationErrorCode(error));
    } finally {
      globalThis.clearTimeout(timeoutId);
      detachAbort?.();
    }
  }
};
