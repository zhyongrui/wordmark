import type { DefinitionBackfillRequestPayload, DefinitionBackfillResponse } from "../../shared/messages";
import { normalizeSelection } from "../../shared/word/normalize";
import { updateDefinitionEn, updateDefinitionZh, updateDefinitionJa } from "../../shared/word/store";
import { updateTranslatedDefinitionEn, updateTranslatedDefinitionZh, updateTranslatedDefinitionJa } from "../../shared/word/store";
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
import { getDirectionDetails } from "../../shared/translation/directions";
import type { TranslationTargetLang } from "../../shared/translation/types";
import type { WordLanguage } from "../../shared/word/normalize";

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

const makeCacheKey = (providerId: string, sourceLang: "en" | "zh" | "ja", normalizedWord: string) =>
  `defbackfill|${providerId}|${sourceLang}|${normalizedWord}|short-v1`;

const resolveDefinitionTranslation = async (
  sourceLang: WordLanguage,
  targetLang: TranslationTargetLang,
  word: string,
  definitionText: string
): Promise<string | null> => {
  const translation = await handleTranslationRequest({
    word,
    definition: definitionText,
    sourceLang,
    targetLang
  });

  return translation.ok && typeof translation.translatedDefinition === "string" && translation.translatedDefinition.trim()
    ? translation.translatedDefinition.trim()
    : null;
};

const toBackfillResponse = (input: {
  sourceLang: WordLanguage;
  targetLang: TranslationTargetLang;
  definitionText: string;
  translatedDefinition: string | null;
}): DefinitionBackfillResponse => {
  const result: DefinitionBackfillResponse = {
    ok: true,
    definitionSourceLang: input.sourceLang,
    definitionEn: null,
    definitionZh: null,
    definitionJa: null,
    definitionSource: "generated"
  };

  // Set the source language definition
  if (input.sourceLang === "en") {
    result.definitionEn = input.definitionText;
  } else if (input.sourceLang === "zh") {
    result.definitionZh = input.definitionText;
  } else if (input.sourceLang === "ja") {
    result.definitionJa = input.definitionText;
  }

  // Set the translated definition
  if (input.translatedDefinition) {
    if (input.targetLang === "en") {
      result.definitionEn = input.translatedDefinition;
    } else if (input.targetLang === "zh") {
      result.definitionZh = input.translatedDefinition;
    } else if (input.targetLang === "ja") {
      result.definitionJa = input.translatedDefinition;
    }
  }

  return result;
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
  if (selection.language !== "en" && selection.language !== "zh" && selection.language !== "ja") {
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

  // Determine target language based on user's translation direction settings
  let targetLang: TranslationTargetLang;
  if (settings.mode === "single") {
    const directionDetails = getDirectionDetails(settings.singleDirection);
    targetLang = directionDetails.target;
  } else {
    // For dual mode, use the opposite language from the source
    const directionDetails = getDirectionDetails(settings.lastDirection);
    targetLang = directionDetails.target;
  }

  const cacheKey = makeCacheKey(provider.id, sourceLang, selection.normalizedWord);
  const cachedDefinitionText = definitionTextCache.get(cacheKey);
  if (cachedDefinitionText) {
    const translatedDefinition = translateDefinitions
      ? await resolveDefinitionTranslation(sourceLang, targetLang, selection.normalizedWord, cachedDefinitionText)
      : null;
    return toBackfillResponse({ sourceLang, targetLang, definitionText: cachedDefinitionText, translatedDefinition });
  }

  return await inSessionDeduper.dedupe(cacheKey, async () => {
    const cachedAgain = definitionTextCache.get(cacheKey);
    if (cachedAgain) {
      const translatedDefinition = translateDefinitions
        ? await resolveDefinitionTranslation(sourceLang, targetLang, selection.normalizedWord, cachedAgain)
        : null;
      return toBackfillResponse({ sourceLang, targetLang, definitionText: cachedAgain, translatedDefinition });
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
      ? await resolveDefinitionTranslation(sourceLang, targetLang, selection.normalizedWord, generated.definitionText)
      : null;

    const response = toBackfillResponse({
      sourceLang,
      targetLang,
      definitionText: generated.definitionText,
      translatedDefinition
    });

    // Save definitions to storage if enabled
    if (response.ok) {
      const saveBackfill = settings.saveDefinitionBackfill;
      const saveTranslation = settings.saveDefinitionTranslation;

      try {
        // Save same-language definitions (source language definition)
        if (saveBackfill) {
          if (sourceLang === "en" && response.definitionEn) {
            await updateDefinitionEn(selection.normalizedWord, response.definitionEn);
          } else if (sourceLang === "zh" && response.definitionZh) {
            await updateDefinitionZh(selection.normalizedWord, response.definitionZh);
          } else if (sourceLang === "ja" && response.definitionJa) {
            await updateDefinitionJa(selection.normalizedWord, response.definitionJa);
          }
        }

        // Save translated definitions (translation of definition to target language)
        // These are stored in separate fields to avoid conflict with same-language definitions
        if (saveTranslation && translatedDefinition) {
          if (targetLang === "en") {
            await updateTranslatedDefinitionEn(selection.normalizedWord, translatedDefinition);
          } else if (targetLang === "zh") {
            await updateTranslatedDefinitionZh(selection.normalizedWord, translatedDefinition);
          } else if (targetLang === "ja") {
            await updateTranslatedDefinitionJa(selection.normalizedWord, translatedDefinition);
          }
        }
      } catch {
        // Ignore storage errors
      }
    }

    return response;
  });
};
