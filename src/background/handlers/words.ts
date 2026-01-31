import { WordEntry } from "../../shared/storage/schema";
import { sortWordEntries } from "../../shared/word/list";
import {
  deleteWordEntry,
  readStore,
  recordLookup,
  writeStore,
  setWordHighlightDisabled,
  addHighlightOnlyWord,
  removeHighlightOnlyWord,
  addHighlightMutedWord,
  removeHighlightMutedWord
} from "../../shared/word/store";
import { shapeLookupResult } from "../../shared/word/lookup";
import { normalizeSelection } from "../../shared/word/normalize";

export type ListWordsResponse =
  | { ok: true; words: WordEntry[]; highlightOnlyWords: string[]; highlightMutedWords: string[] }
  | { ok: false; error: "unknown" };

export const handleListWords = async (): Promise<ListWordsResponse> => {
  try {
    const store = await readStore();
    const words = sortWordEntries(Object.values(store.wordsByKey));
    return {
      ok: true,
      words,
      highlightOnlyWords: Array.isArray(store.highlightOnlyWords) ? store.highlightOnlyWords : [],
      highlightMutedWords: Array.isArray(store.highlightMutedWords) ? store.highlightMutedWords : []
    };
  } catch {
    return { ok: false, error: "unknown" };
  }
};

export type DeleteWordPayload = {
  normalizedWord: string;
  direction?: string;
};

export type DeleteWordResponse =
  | { ok: true; fullyDeleted: boolean; remainingTranslations: string[] }
  | { ok: false; error: "invalid-payload" | "unknown" };

export const handleDeleteWord = async (payload: DeleteWordPayload): Promise<DeleteWordResponse> => {
  if (!payload || typeof payload.normalizedWord !== "string") {
    return { ok: false, error: "invalid-payload" };
  }

  try {
    const result = await deleteWordEntry(payload.normalizedWord, payload.direction);
    return { ok: true, ...result };
  } catch {
    return { ok: false, error: "unknown" };
  }
};

export type AddWordPayload = {
  word: string;
  ttsAvailable?: boolean;
};

export type AddWordResponse =
  | { ok: true; entry: WordEntry }
  | { ok: false; error: "invalid-payload" | "invalid-selection" | "unknown" };

export const handleAddWord = async (payload: AddWordPayload): Promise<AddWordResponse> => {
  if (!payload || typeof payload.word !== "string") {
    return { ok: false, error: "invalid-payload" };
  }

  try {
    const selection = normalizeSelection(payload.word);
    if (!selection) {
      return { ok: false, error: "invalid-selection" };
    }

    const result = shapeLookupResult({
      normalizedWord: selection.normalizedWord,
      displayWord: payload.word,
      ttsAvailable: Boolean(payload.ttsAvailable)
    });

    const entry = await recordLookup(result);
    return { ok: true, entry };
  } catch {
    return { ok: false, error: "unknown" };
  }
};

export type RestoreWordPayload = {
  normalizedWord: string;
  previousEntry: WordEntry | null;
};

export type RestoreWordResponse =
  | { ok: true; entry: WordEntry | null }
  | { ok: false; error: "invalid-payload" | "unknown" };

export const handleRestoreWord = async (payload: RestoreWordPayload): Promise<RestoreWordResponse> => {
  if (!payload || typeof payload.normalizedWord !== "string") {
    return { ok: false, error: "invalid-payload" };
  }

  try {
    const store = await readStore();
    const nextWords = { ...store.wordsByKey };
    if (payload.previousEntry) {
      nextWords[payload.normalizedWord] = payload.previousEntry;
    } else {
      delete nextWords[payload.normalizedWord];
    }
    await writeStore({ ...store, wordsByKey: nextWords });
    return { ok: true, entry: payload.previousEntry ?? null };
  } catch {
    return { ok: false, error: "unknown" };
  }
};

export type SetWordHighlightPayload = {
  normalizedWord: string;
  highlightDisabled: boolean;
};

export type SetWordHighlightResponse =
  | { ok: true; entry: WordEntry }
  | { ok: false; error: "invalid-payload" | "not_found" | "unknown" };

export const handleSetWordHighlight = async (
  payload: SetWordHighlightPayload
): Promise<SetWordHighlightResponse> => {
  if (
    !payload ||
    typeof payload.normalizedWord !== "string" ||
    typeof payload.highlightDisabled !== "boolean"
  ) {
    return { ok: false, error: "invalid-payload" };
  }

  try {
    const entry = await setWordHighlightDisabled(payload.normalizedWord, payload.highlightDisabled);
    if (!entry) {
      return { ok: false, error: "not_found" };
    }
    return { ok: true, entry };
  } catch {
    return { ok: false, error: "unknown" };
  }
};

export type HighlightOnlyPayload = {
  normalizedWord: string;
};

export type HighlightOnlyResponse =
  | { ok: true; highlightOnlyWords: string[] }
  | { ok: false; error: "invalid-payload" | "unknown" };

export const handleAddHighlightOnlyWord = async (
  payload: HighlightOnlyPayload
): Promise<HighlightOnlyResponse> => {
  if (!payload || typeof payload.normalizedWord !== "string") {
    return { ok: false, error: "invalid-payload" };
  }

  try {
    const highlightOnlyWords = await addHighlightOnlyWord(payload.normalizedWord);
    return { ok: true, highlightOnlyWords };
  } catch {
    return { ok: false, error: "unknown" };
  }
};

export const handleRemoveHighlightOnlyWord = async (
  payload: HighlightOnlyPayload
): Promise<HighlightOnlyResponse> => {
  if (!payload || typeof payload.normalizedWord !== "string") {
    return { ok: false, error: "invalid-payload" };
  }

  try {
    const highlightOnlyWords = await removeHighlightOnlyWord(payload.normalizedWord);
    return { ok: true, highlightOnlyWords };
  } catch {
    return { ok: false, error: "unknown" };
  }
};

export type HighlightMutedResponse =
  | { ok: true; highlightMutedWords: string[] }
  | { ok: false; error: "invalid-payload" | "unknown" };

export const handleAddHighlightMutedWord = async (
  payload: HighlightOnlyPayload
): Promise<HighlightMutedResponse> => {
  if (!payload || typeof payload.normalizedWord !== "string") {
    return { ok: false, error: "invalid-payload" };
  }

  try {
    const highlightMutedWords = await addHighlightMutedWord(payload.normalizedWord);
    return { ok: true, highlightMutedWords };
  } catch {
    return { ok: false, error: "unknown" };
  }
};

export const handleRemoveHighlightMutedWord = async (
  payload: HighlightOnlyPayload
): Promise<HighlightMutedResponse> => {
  if (!payload || typeof payload.normalizedWord !== "string") {
    return { ok: false, error: "invalid-payload" };
  }

  try {
    const highlightMutedWords = await removeHighlightMutedWord(payload.normalizedWord);
    return { ok: true, highlightMutedWords };
  } catch {
    return { ok: false, error: "unknown" };
  }
};
