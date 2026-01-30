import { WordEntry } from "../../shared/storage/schema";
import { sortWordEntries } from "../../shared/word/list";
import { deleteWordEntry, readStore } from "../../shared/word/store";

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
