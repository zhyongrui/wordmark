import type { DefinitionSource } from "../../shared/messages";
import { shapeLookupResult } from "../../shared/word/lookup";
import { normalizeSelection } from "../../shared/word/normalize";
import { recordLookup, readStore } from "../../shared/word/store";
import type { WordEntry } from "../../shared/storage/schema";
import { readTranslationSettings } from "../../shared/translation/settings";

export type LookupRequestPayload = {
  selectedText: string;
  ttsAvailable: boolean;
};

export type LookupResponse =
  | {
      ok: true;
      entry: Awaited<ReturnType<typeof recordLookup>> & {
        definitionSource: DefinitionSource;
      };
      wasExisting: boolean;
      savedByLookup: boolean;
      previousEntry: WordEntry | null;
    }
  | { ok: false; error: "invalid-selection" | "invalid-payload" };

export const handleLookupRequest = async (payload: LookupRequestPayload): Promise<LookupResponse> => {
  if (!payload || typeof payload.selectedText !== "string") {
    return { ok: false, error: "invalid-payload" };
  }

  const selection = normalizeSelection(payload.selectedText);
  if (!selection) {
    return { ok: false, error: "invalid-selection" };
  }

  const result = shapeLookupResult({
    normalizedWord: selection.normalizedWord,
    displayWord: payload.selectedText,
    ttsAvailable: Boolean(payload.ttsAvailable)
  });

  // Check if we should save queried words
  const settings = await readTranslationSettings();
  const store = await readStore();
  const existing = store.wordsByKey[selection.normalizedWord];
  let storedEntry;
  let savedByLookup = false;

  if (settings.saveQueriedWords) {
    storedEntry = await recordLookup(result);
    savedByLookup = true;
  } else {
    // Don't record, but check if word already exists
    storedEntry = existing || {
      normalizedWord: selection.normalizedWord,
      displayWord: payload.selectedText,
      queryCount: 0,
      lastQueriedAt: new Date().toISOString(),
      pronunciationAvailable: result.pronunciationAvailable
    };
  }

  const hasLocalDefinition =
    (selection.language === "en" && typeof storedEntry.definitionEn === "string" && storedEntry.definitionEn.trim()) ||
    (selection.language === "zh" && typeof storedEntry.definitionZh === "string" && storedEntry.definitionZh.trim()) ||
    (selection.language === "ja" && typeof storedEntry.definitionJa === "string" && storedEntry.definitionJa.trim());
  const entry = {
    ...storedEntry,
    definitionSource: (hasLocalDefinition ? "local" : "none") as DefinitionSource,
    pronunciationAvailable: result.pronunciationAvailable
  };
  return { ok: true, entry, wasExisting: Boolean(existing), savedByLookup, previousEntry: existing ?? null };
};
