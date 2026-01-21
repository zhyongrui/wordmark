import {
  createTranslationError,
  type TranslationRequest,
  type TranslationResponse,
  type TranslationSuccess
} from "../../shared/translation/types";
import { createInMemoryTtlCache, createInSessionDeduper } from "../../shared/translation/cache";
import { geminiProvider } from "../../shared/translation/providers/gemini";
import { moonshotProvider } from "../../shared/translation/providers/moonshot";
import { openaiProvider } from "../../shared/translation/providers/openai";
import { volcengineProvider } from "../../shared/translation/providers/volcengine";
import { zhipuProvider } from "../../shared/translation/providers/zhipu";
import { readTranslationSettings } from "../../shared/translation/settings";
import { getTranslationApiKey } from "../../shared/translation/secrets";
import { getMoonshotConfig } from "../../shared/translation/moonshot";
import { getOpenAIConfig } from "../../shared/translation/openai";
import { getVolcengineConfig } from "../../shared/translation/volcengine";
import { getZhipuConfig } from "../../shared/translation/zhipu";
import { normalizeWord } from "../../shared/word/normalize";
import { updateWordZh } from "../../shared/word/store";

export type TranslationRequestPayload = TranslationRequest;

const inSessionDeduper = createInSessionDeduper<TranslationResponse>();
const translationResultCache = createInMemoryTtlCache<TranslationSuccess>({ ttlMs: 20 * 60 * 1000 });

const getProvider = (providerId: string) => {
  switch (providerId) {
    case "gemini":
      return geminiProvider;
    case "moonshot":
      return moonshotProvider;
    case "openai":
      return openaiProvider;
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

  const apiKey = await getTranslationApiKey();
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
  if (settings.providerId === "zhipu") {
    const config = await getZhipuConfig();
    if (!config) {
      return createTranslationError("not_configured");
    }
  }

  const request: TranslationRequest = {
    word: payload.word,
    definition: typeof payload.definition === "string" ? payload.definition : null,
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
        await updateWordZh(normalizedWord, response.translatedWord);
      } catch {
        // ignore storage errors
      }
    }
  }

  return response;
};
