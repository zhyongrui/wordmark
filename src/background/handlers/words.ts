import { WordEntry } from "../../shared/storage/schema";
import { sortWordEntries } from "../../shared/word/list";
import { deleteWordEntry, readStore, recordLookup } from "../../shared/word/store";
import { shapeLookupResult } from "../../shared/word/lookup";
import { normalizeSelection } from "../../shared/word/normalize";

export type ListWordsResponse =
  | { ok: true; words: WordEntry[] }
  | { ok: false; error: "unknown" };

export const handleListWords = async (): Promise<ListWordsResponse> => {
  try {
    const store = await readStore();
    const words = sortWordEntries(Object.values(store.wordsByKey));
    return { ok: true, words };
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
