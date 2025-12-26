import { lookupDictionary } from "../../shared/dictionary";
import { shapeLookupResult } from "../../shared/word/lookup";
import { normalizeWord } from "../../shared/word/normalize";
import { recordLookup } from "../../shared/word/store";

export type LookupRequestPayload = {
  selectedText: string;
  ttsAvailable: boolean;
};

export type LookupResponse =
  | { ok: true; entry: Awaited<ReturnType<typeof recordLookup>> }
  | { ok: false; error: "invalid-selection" | "invalid-payload" };

export const handleLookupRequest = async (payload: LookupRequestPayload): Promise<LookupResponse> => {
  if (!payload || typeof payload.selectedText !== "string") {
    return { ok: false, error: "invalid-payload" };
  }

  const normalized = normalizeWord(payload.selectedText);
  if (!normalized) {
    return { ok: false, error: "invalid-selection" };
  }

  const dictionaryEntry = lookupDictionary(normalized);
  const result = shapeLookupResult({
    normalizedWord: normalized,
    displayWord: payload.selectedText,
    dictionaryEntry,
    ttsAvailable: Boolean(payload.ttsAvailable)
  });

  const storedEntry = await recordLookup(result);
  const entry = {
    ...storedEntry,
    definition: result.definition,
    pronunciationAvailable: result.pronunciationAvailable
  };
  return { ok: true, entry };
};
