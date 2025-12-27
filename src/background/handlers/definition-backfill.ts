import type { DefinitionBackfillRequestPayload, DefinitionBackfillResponse } from "../../shared/messages";
import { normalizeWord } from "../../shared/word/normalize";
import { geminiDefinitionProvider } from "../../shared/definition/providers/gemini";
import { createInMemoryTtlCache, createInSessionDeduper } from "../../shared/translation/cache";
import { readTranslationSettings } from "../../shared/translation/settings";
import { getTranslationApiKey } from "../../shared/translation/secrets";
import { handleTranslationRequest } from "./translation";

const inSessionDeduper = createInSessionDeduper<DefinitionBackfillResponse>();
const definitionEnCache = createInMemoryTtlCache<string>({ ttlMs: 20 * 60 * 1000 });

const getProvider = (providerId: string) => {
  switch (providerId) {
    case "gemini":
      return geminiDefinitionProvider;
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

  const apiKey = await getTranslationApiKey();
  if (!apiKey) {
    return { ok: false, error: "not_configured", message: "Definition backfill is not configured." };
  }

  const provider = getProvider(settings.providerId);
  if (!provider) {
    return { ok: false, error: "provider_error", message: "Definition backfill unavailable (provider error)." };
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
