import type { DefinitionBackfillRequestPayload, DefinitionBackfillResponse } from "../../shared/messages";
import { normalizeSelection } from "../../shared/word/normalize";
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
const definitionTextCache = createInMemoryTtlCache<string>({ ttlMs: 20 * 60 * 1000 });

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

const makeCacheKey = (providerId: string, sourceLang: "en" | "zh", normalizedWord: string) =>
  `defbackfill|${providerId}|${sourceLang}|${normalizedWord}|short-v1`;

const resolveDefinitionTranslation = async (
  sourceLang: "en" | "zh",
  word: string,
  definitionText: string
): Promise<string | null> => {
  const translation = await handleTranslationRequest({
    word,
    definition: definitionText,
    targetLang: sourceLang === "en" ? "zh" : "en"
  });

  return translation.ok && typeof translation.translatedDefinition === "string" && translation.translatedDefinition.trim()
    ? translation.translatedDefinition.trim()
    : null;
};

const toBackfillResponse = (input: {
  sourceLang: "en" | "zh";
  definitionText: string;
  translatedDefinition: string | null;
}): DefinitionBackfillResponse => {
  if (input.sourceLang === "en") {
    return {
      ok: true,
      definitionSourceLang: "en",
      definitionEn: input.definitionText,
      definitionZh: input.translatedDefinition,
      definitionSource: "generated"
    };
  }

  return {
    ok: true,
    definitionSourceLang: "zh",
    definitionEn: input.translatedDefinition,
    definitionZh: input.definitionText,
    definitionSource: "generated"
  };
};

export const handleDefinitionBackfillRequest = async (
  payload: DefinitionBackfillRequestPayload
): Promise<DefinitionBackfillResponse> => {
  if (!payload || typeof payload.word !== "string") {
    return { ok: false, error: "provider_error", message: "Definition unavailable (invalid request)." };
  }

  const selection = normalizeSelection(payload.word);
  if (!selection) {
    return { ok: false, error: "provider_error", message: "Definition unavailable (invalid word)." };
  }
  if (selection.language !== "en" && selection.language !== "zh") {
    return { ok: false, error: "provider_error", message: "Definition unavailable." };
  }

  const settings = await readTranslationSettings();
  if (!settings.enabled || !settings.definitionBackfillEnabled) {
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

  const sourceLang = selection.language;
  const translateDefinitions = settings.definitionTranslationEnabled;
  const cacheKey = makeCacheKey(provider.id, sourceLang, selection.normalizedWord);
  const cachedDefinitionText = definitionTextCache.get(cacheKey);
  if (cachedDefinitionText) {
    const translatedDefinition = translateDefinitions
      ? await resolveDefinitionTranslation(sourceLang, selection.normalizedWord, cachedDefinitionText)
      : null;
    return toBackfillResponse({ sourceLang, definitionText: cachedDefinitionText, translatedDefinition });
  }

  return await inSessionDeduper.dedupe(cacheKey, async () => {
    const cachedAgain = definitionTextCache.get(cacheKey);
    if (cachedAgain) {
      const translatedDefinition = translateDefinitions
        ? await resolveDefinitionTranslation(sourceLang, selection.normalizedWord, cachedAgain)
        : null;
      return toBackfillResponse({ sourceLang, definitionText: cachedAgain, translatedDefinition });
    }

    const generated = await provider.generateDefinition(
      { word: selection.normalizedWord, sourceLang },
      apiKey
    );
    if (!generated.ok) {
      return { ok: false, error: generated.error, message: generated.message };
    }

    definitionTextCache.set(cacheKey, generated.definitionText);

    const translatedDefinition = translateDefinitions
      ? await resolveDefinitionTranslation(sourceLang, selection.normalizedWord, generated.definitionText)
      : null;

    return toBackfillResponse({
      sourceLang,
      definitionText: generated.definitionText,
      translatedDefinition
    });
  });
};
