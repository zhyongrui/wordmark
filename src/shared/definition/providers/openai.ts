import {
  createDefinitionError,
  mapHttpStatusToDefinitionErrorCode,
  mapUnknownErrorToDefinitionErrorCode,
  type DefinitionRequest,
  type DefinitionResponse
} from "../types";
import { sanitizeEnglishDefinitionText } from "../sanitize";
import { getOpenAIConfig } from "../../translation/openai";
import type { DefinitionProvider } from "./provider";

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

const buildSystemPrompt = (): string => {
  return [
    "Write a short English dictionary-style definition for the given word.",
    "Constraints:",
    "- Plain text only (no Markdown, no code fences).",
    "- 1-2 sentences.",
    "- Maximum 240 characters."
  ].join("\n");
};

const buildUserPrompt = (request: DefinitionRequest): string => {
  return `Word: ${request.word}`;
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

export const openaiDefinitionProvider: DefinitionProvider = {
  id: "openai",
  generateDefinition: async (
    request: DefinitionRequest,
    apiKey: string,
    options?: { signal?: AbortSignal }
  ): Promise<DefinitionResponse> => {
    const word = typeof request.word === "string" ? request.word.trim() : "";
    if (!word) {
      return createDefinitionError("provider_error", "Definition unavailable (invalid word).");
    }

    const config = await getOpenAIConfig();
    if (!config) {
      return createDefinitionError("provider_error", "Definition unavailable (provider not configured).");
    }

    const controller = new AbortController();
    const detachAbort = attachAbortSignal(controller, options?.signal);
    const timeoutId = globalThis.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const requestBody = JSON.stringify({
        model: config.modelId,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserPrompt({ word }) }
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
        const errorCode = mapHttpStatusToDefinitionErrorCode(response.status);
        const snippet = await readErrorSnippet(response);
        const details = snippet ? ` Details: ${snippet}` : "";
        return createDefinitionError(
          errorCode,
          `Definition unavailable (HTTP ${response.status}) via OpenAI.${details}`
        );
      }

      const candidate = await extractMessageContent(response);
      if (!candidate) {
        return createDefinitionError("provider_error", "Definition unavailable (unexpected provider response).");
      }

      const sanitized = sanitizeEnglishDefinitionText(candidate, { maxChars: 240 });
      if (!sanitized) {
        return createDefinitionError("provider_error", "Definition unavailable (empty provider response).");
      }

      return { ok: true, definitionEn: sanitized };
    } catch (error) {
      return createDefinitionError(mapUnknownErrorToDefinitionErrorCode(error));
    } finally {
      globalThis.clearTimeout(timeoutId);
      detachAbort?.();
    }
  }
};
