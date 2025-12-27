import {
  createTranslationError,
  type TranslationRequest,
  type TranslationResponse,
  type TranslationSuccess
} from "../../shared/translation/types";
import { createInMemoryTtlCache, createInSessionDeduper } from "../../shared/translation/cache";
import { geminiProvider } from "../../shared/translation/providers/gemini";
import { readTranslationSettings } from "../../shared/translation/settings";
import { getTranslationApiKey } from "../../shared/translation/secrets";

export type TranslationRequestPayload = TranslationRequest;

const inSessionDeduper = createInSessionDeduper<TranslationResponse>();
const translationResultCache = createInMemoryTtlCache<TranslationSuccess>({ ttlMs: 20 * 60 * 1000 });

const getProvider = (providerId: string) => {
  switch (providerId) {
    case "gemini":
      return geminiProvider;
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

  const request: TranslationRequest = {
    word: payload.word,
    definition: typeof payload.definition === "string" ? payload.definition : null,
    targetLang: payload.targetLang
  };

  const dedupeKey = makeDedupeKey(provider.id, request);
  const cached = translationResultCache.get(dedupeKey);
  if (cached) {
    return cached;
  }
  return await inSessionDeduper.dedupe(dedupeKey, async () => {
    const cachedAgain = translationResultCache.get(dedupeKey);
    if (cachedAgain) {
      return cachedAgain;
    }

    try {
      const response = await provider.translate(request, apiKey);
      if (response.ok) {
        translationResultCache.set(dedupeKey, response);
      }
      return response;
    } catch {
      return createTranslationError("provider_error");
    }
  });
};
