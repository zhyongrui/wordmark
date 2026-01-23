import type { DefinitionBackfillRequestPayload, DefinitionBackfillResponse } from "../../shared/messages";
import { normalizeWord } from "../../shared/word/normalize";
import { geminiDefinitionProvider } from "../../shared/definition/providers/gemini";
import { deepseekDefinitionProvider } from "../../shared/definition/providers/deepseek";
import { moonshotDefinitionProvider } from "../../shared/definition/providers/moonshot";
import { openaiDefinitionProvider } from "../../shared/definition/providers/openai";
import { qwenDefinitionProvider } from "../../shared/definition/providers/qwen";
import { volcengineDefinitionProvider } from "../../shared/definition/providers/volcengine";
import { zhipuDefinitionProvider } from "../../shared/definition/providers/zhipu";
import { createInMemoryTtlCache, createInSessionDeduper } from "../../shared/translation/cache";
import { readTranslationSettings } from "../../shared/translation/settings";
import { getTranslationApiKey } from "../../shared/translation/secrets";
import { getDeepSeekConfig } from "../../shared/translation/deepseek";
import { getMoonshotConfig } from "../../shared/translation/moonshot";
import { getOpenAIConfig } from "../../shared/translation/openai";
import { getQwenConfig } from "../../shared/translation/qwen";
import { getVolcengineConfig } from "../../shared/translation/volcengine";
import { getZhipuConfig } from "../../shared/translation/zhipu";
import { handleTranslationRequest } from "./translation";

const inSessionDeduper = createInSessionDeduper<DefinitionBackfillResponse>();
const definitionEnCache = createInMemoryTtlCache<string>({ ttlMs: 20 * 60 * 1000 });

const getProvider = (providerId: string) => {
  switch (providerId) {
    case "gemini":
      return geminiDefinitionProvider;
    case "deepseek":
      return deepseekDefinitionProvider;
    case "moonshot":
      return moonshotDefinitionProvider;
    case "openai":
      return openaiDefinitionProvider;
    case "qwen":
      return qwenDefinitionProvider;
    case "volcengine":
      return volcengineDefinitionProvider;
    case "zhipu":
      return zhipuDefinitionProvider;
    default:
      return null;
  }
};

const makeCacheKey = (providerId: string, normalizedWord: string) =>
  `defbackfill|${providerId}|zh|${normalizedWord}|short-v1`;

export const handleDefinitionBackfillRequest = async (
  payload: DefinitionBackfillRequestPayload
): Promise<DefinitionBackfillResponse> => {
  if (!payload || typeof payload.word !== "string") {
    return { ok: false, error: "provider_error", message: "Definition unavailable (invalid request)." };
  }

  const normalized = normalizeWord(payload.word);
  if (!normalized) {
    return { ok: false, error: "provider_error", message: "Definition unavailable (invalid word)." };
  }

  const settings = await readTranslationSettings();
  if (!settings.enabled) {
    return { ok: false, error: "disabled", message: "Definition backfill is disabled." };
  }

  const apiKey = await getTranslationApiKey(settings.providerId);
  if (!apiKey) {
    return { ok: false, error: "not_configured", message: "Definition backfill is not configured." };
  }

  const provider = getProvider(settings.providerId);
  if (!provider) {
    return { ok: false, error: "provider_error", message: "Definition backfill unavailable (provider error)." };
  }

  if (settings.providerId === "volcengine") {
    const config = await getVolcengineConfig();
    if (!config) {
      return { ok: false, error: "not_configured", message: "Definition backfill is not configured." };
    }
  }
  if (settings.providerId === "deepseek") {
    const config = await getDeepSeekConfig();
    if (!config) {
      return { ok: false, error: "not_configured", message: "Definition backfill is not configured." };
    }
  }
  if (settings.providerId === "moonshot") {
    const config = await getMoonshotConfig();
    if (!config) {
      return { ok: false, error: "not_configured", message: "Definition backfill is not configured." };
    }
  }
  if (settings.providerId === "openai") {
    const config = await getOpenAIConfig();
    if (!config) {
      return { ok: false, error: "not_configured", message: "Definition backfill is not configured." };
    }
  }
  if (settings.providerId === "qwen") {
    const config = await getQwenConfig();
    if (!config) {
      return { ok: false, error: "not_configured", message: "Definition backfill is not configured." };
    }
  }
  if (settings.providerId === "zhipu") {
    const config = await getZhipuConfig();
    if (!config) {
      return { ok: false, error: "not_configured", message: "Definition backfill is not configured." };
    }
  }

  const cacheKey = makeCacheKey(provider.id, normalized);
  const cachedDefinitionEn = definitionEnCache.get(cacheKey);
  if (cachedDefinitionEn) {
    const translation = await handleTranslationRequest({
      word: normalized,
      definition: cachedDefinitionEn,
      targetLang: "zh"
    });
    const definitionZh =
      translation.ok && typeof translation.translatedDefinition === "string" && translation.translatedDefinition.trim()
        ? translation.translatedDefinition.trim()
        : null;

    return {
      ok: true,
      definitionEn: cachedDefinitionEn,
      definitionSource: "generated",
      definitionZh
    };
  }

  return await inSessionDeduper.dedupe(cacheKey, async () => {
    const cachedAgain = definitionEnCache.get(cacheKey);
    if (cachedAgain) {
      const translation = await handleTranslationRequest({
        word: normalized,
        definition: cachedAgain,
        targetLang: "zh"
      });
      const definitionZh =
        translation.ok && typeof translation.translatedDefinition === "string" && translation.translatedDefinition.trim()
          ? translation.translatedDefinition.trim()
          : null;

      return {
        ok: true,
        definitionEn: cachedAgain,
        definitionSource: "generated",
        definitionZh
      };
    }

    const generated = await provider.generateDefinition({ word: normalized }, apiKey);
    if (!generated.ok) {
      return { ok: false, error: generated.error, message: generated.message };
    }

    definitionEnCache.set(cacheKey, generated.definitionEn);

    const translation = await handleTranslationRequest({
      word: normalized,
      definition: generated.definitionEn,
      targetLang: "zh"
    });
    const definitionZh =
      translation.ok && typeof translation.translatedDefinition === "string" && translation.translatedDefinition.trim()
        ? translation.translatedDefinition.trim()
        : null;

    return {
      ok: true,
      definitionEn: generated.definitionEn,
      definitionSource: "generated",
      definitionZh
    };
  });
};
