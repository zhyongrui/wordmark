import {
  createTranslationError,
  type TranslationRequest,
  type TranslationResponse,
  type TranslationSuccess
} from "../../shared/translation/types";
import { createInMemoryTtlCache, createInSessionDeduper } from "../../shared/translation/cache";
import { geminiProvider } from "../../shared/translation/providers/gemini";
import { deepseekProvider } from "../../shared/translation/providers/deepseek";
import { moonshotProvider } from "../../shared/translation/providers/moonshot";
import { openaiProvider } from "../../shared/translation/providers/openai";
import { qwenProvider } from "../../shared/translation/providers/qwen";
import { volcengineProvider } from "../../shared/translation/providers/volcengine";
import { zhipuProvider } from "../../shared/translation/providers/zhipu";
import { readTranslationSettings, updateTranslationSettings } from "../../shared/translation/settings";
import { getTranslationApiKey } from "../../shared/translation/secrets";
import { getDeepSeekConfig } from "../../shared/translation/deepseek";
import { getMoonshotConfig } from "../../shared/translation/moonshot";
import { getOpenAIConfig } from "../../shared/translation/openai";
import { getQwenConfig } from "../../shared/translation/qwen";
import { getVolcengineConfig } from "../../shared/translation/volcengine";
import { getZhipuConfig } from "../../shared/translation/zhipu";
import { getDirectionFromLanguages } from "../../shared/translation/directions";
import { normalizeWord } from "../../shared/word/normalize";
import { updateWordEn, updateWordJa, updateWordZh } from "../../shared/word/store";

export type TranslationRequestPayload = TranslationRequest;

const inSessionDeduper = createInSessionDeduper<TranslationResponse>();
const translationResultCache = createInMemoryTtlCache<TranslationSuccess>({ ttlMs: 7 * 24 * 60 * 60 * 1000 });

const getProvider = (providerId: string) => {
  switch (providerId) {
    case "gemini":
      return geminiProvider;
    case "deepseek":
      return deepseekProvider;
    case "moonshot":
      return moonshotProvider;
    case "openai":
      return openaiProvider;
    case "qwen":
      return qwenProvider;
    case "volcengine":
      return volcengineProvider;
    case "zhipu":
      return zhipuProvider;
    default:
      return null;
  }
};

const makeDedupeKey = (providerId: string, request: TranslationRequest): string => {
  const definition = typeof request.definition === "string" ? request.definition : "";
  return `${providerId}|${request.targetLang}|${request.word}|${definition}`;
};

export const handleTranslationRequest = async (
  payload: TranslationRequestPayload
): Promise<TranslationResponse> => {
  const settings = await readTranslationSettings();
  if (!settings.enabled) {
    return createTranslationError("disabled");
  }

  try {
    const nextDirection = getDirectionFromLanguages(payload.sourceLang, payload.targetLang);
    if (nextDirection) {
      await updateTranslationSettings({ lastDirection: nextDirection });
    }
  } catch {
    // ignore storage errors
  }

  const apiKey = await getTranslationApiKey(settings.providerId);
  if (!apiKey) {
    return createTranslationError("not_configured");
  }

  const provider = getProvider(settings.providerId);
  if (!provider) {
    return createTranslationError("provider_error");
  }

  if (settings.providerId === "volcengine") {
    const config = await getVolcengineConfig();
    if (!config) {
      return createTranslationError("not_configured");
    }
  }
  if (settings.providerId === "deepseek") {
    const config = await getDeepSeekConfig();
    if (!config) {
      return createTranslationError("not_configured");
    }
  }
  if (settings.providerId === "moonshot") {
    const config = await getMoonshotConfig();
    if (!config) {
      return createTranslationError("not_configured");
    }
  }
  if (settings.providerId === "openai") {
    const config = await getOpenAIConfig();
    if (!config) {
      return createTranslationError("not_configured");
    }
  }
  if (settings.providerId === "qwen") {
    const config = await getQwenConfig();
    if (!config) {
      return createTranslationError("not_configured");
    }
  }
  if (settings.providerId === "zhipu") {
    const config = await getZhipuConfig();
    if (!config) {
      return createTranslationError("not_configured");
    }
  }

  const request: TranslationRequest = {
    word: payload.word,
    definition: typeof payload.definition === "string" ? payload.definition : null,
    sourceLang: payload.sourceLang,
    targetLang: payload.targetLang
  };

  const dedupeKey = makeDedupeKey(provider.id, request);
  const cached = translationResultCache.get(dedupeKey);
  const response: TranslationResponse =
    cached ??
    (await inSessionDeduper.dedupe(dedupeKey, async () => {
      const cachedAgain = translationResultCache.get(dedupeKey);
      if (cachedAgain) {
        return cachedAgain;
      }

      try {
        const next = await provider.translate(request, apiKey);
        if (next.ok) {
          translationResultCache.set(dedupeKey, next);
        }
        return next;
      } catch {
        return createTranslationError("provider_error");
      }
    }));

  if (response.ok) {
    const normalizedWord = normalizeWord(request.word);
    if (normalizedWord) {
      try {
        if (request.targetLang === "zh") {
          await updateWordZh(normalizedWord, response.translatedWord);
        } else if (request.targetLang === "en") {
          await updateWordEn(normalizedWord, response.translatedWord);
        } else if (request.targetLang === "ja") {
          await updateWordJa(normalizedWord, response.translatedWord);
        }
        // Note: definition translation is saved separately through the definition backfill flow
      } catch {
        // ignore storage errors
      }
    }
  }

  return response;
};
