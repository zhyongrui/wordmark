import { createTranslationError, type TranslationRequest, type TranslationResponse } from "../../shared/translation/types";
import { createInSessionDeduper } from "../../shared/translation/cache";
import { geminiProvider } from "../../shared/translation/providers/gemini";
import { readTranslationSettings } from "../../shared/translation/settings";
import { getTranslationApiKey } from "../../shared/translation/secrets";

export type TranslationRequestPayload = TranslationRequest;

const inSessionDeduper = createInSessionDeduper<TranslationResponse>();

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
  return await inSessionDeduper.dedupe(dedupeKey, async () => {
    try {
      return await provider.translate(request, apiKey);
    } catch {
      return createTranslationError("provider_error");
    }
  });
};
