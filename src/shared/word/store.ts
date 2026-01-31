import { migrateStorage } from "../storage/migrate";
import { createEmptyStorage, StorageEnvelope, WordEntry } from "../storage/schema";
import { normalizeWord } from "./normalize";

const STORAGE_KEY = "wordmark:storage";

type StorageArea = {
  get: (keys: string | string[]) => Promise<Record<string, unknown>> | void;
  set: (items: Record<string, unknown>) => Promise<void> | void;
};

const memoryStore: { data: StorageEnvelope } = { data: createEmptyStorage() };

const getStorageArea = (): StorageArea | null => {
  const chromeRef = (globalThis as { chrome?: { storage?: { local?: StorageArea } } }).chrome;
  return chromeRef?.storage?.local ?? null;
};

const readFromChrome = async (storage: StorageArea): Promise<Record<string, unknown>> => {
  return await new Promise((resolve) => {
    try {
      const result = storage.get([STORAGE_KEY]);
      if (result && typeof (result as Promise<Record<string, unknown>>).then === "function") {
        (result as Promise<Record<string, unknown>>)
          .then(resolve)
          .catch(() => resolve({}));
      } else {
        (storage as unknown as { get: (keys: string[], cb: (items: Record<string, unknown>) => void) => void })
          .get([STORAGE_KEY], (items) => resolve(items));
      }
    } catch {
      resolve({});
    }
  });
};

const writeToChrome = async (storage: StorageArea, payload: StorageEnvelope): Promise<void> => {
  await new Promise((resolve) => {
    try {
      const result = storage.set({ [STORAGE_KEY]: payload });
      if (result && typeof (result as Promise<void>).then === "function") {
        (result as Promise<void>).then(() => resolve(undefined)).catch(() => resolve(undefined));
      } else {
        (storage as unknown as { set: (items: Record<string, unknown>, cb: () => void) => void })
          .set({ [STORAGE_KEY]: payload }, () => resolve(undefined));
      }
    } catch {
      resolve(undefined);
    }
  });
};

export const readStore = async (): Promise<StorageEnvelope> => {
  const storage = getStorageArea();
  if (!storage) {
    return memoryStore.data;
  }

  const result = await readFromChrome(storage);
  return migrateStorage(result[STORAGE_KEY]);
};

export const writeStore = async (next: StorageEnvelope): Promise<void> => {
  const payload: StorageEnvelope = {
    ...next,
    updatedAt: new Date().toISOString()
  };
  const storage = getStorageArea();

  if (!storage) {
    memoryStore.data = payload;
    return;
  }

  await writeToChrome(storage, payload);
};

export const recordLookup = async (entry: Omit<WordEntry, "queryCount" | "lastQueriedAt">): Promise<WordEntry> => {
  const store = await readStore();
  const existing = store.wordsByKey[entry.normalizedWord];
  const existingWordZh =
    existing && typeof existing.wordZh === "string" && existing.wordZh.trim() ? existing.wordZh : null;
  const existingWordJa =
    existing && typeof existing.wordJa === "string" && existing.wordJa.trim() ? existing.wordJa : null;
  const existingWordEn =
    existing && typeof existing.wordEn === "string" && existing.wordEn.trim() ? existing.wordEn : null;
  const existingDefinitionEn =
    existing && typeof existing.definitionEn === "string" && existing.definitionEn.trim() ? existing.definitionEn : null;
  const existingDefinitionZh =
    existing && typeof existing.definitionZh === "string" && existing.definitionZh.trim() ? existing.definitionZh : null;
  const existingDefinitionJa =
    existing && typeof existing.definitionJa === "string" && existing.definitionJa.trim() ? existing.definitionJa : null;
  const existingTranslatedDefinitionEn =
    existing && typeof existing.translatedDefinitionEn === "string" && existing.translatedDefinitionEn.trim() ? existing.translatedDefinitionEn : null;
  const existingTranslatedDefinitionZh =
    existing && typeof existing.translatedDefinitionZh === "string" && existing.translatedDefinitionZh.trim() ? existing.translatedDefinitionZh : null;
  const existingTranslatedDefinitionJa =
    existing && typeof existing.translatedDefinitionJa === "string" && existing.translatedDefinitionJa.trim() ? existing.translatedDefinitionJa : null;
  const existingHighlightDisabled = existing?.highlightDisabled;
  const nextWordZh =
    typeof entry.wordZh === "string" && entry.wordZh.trim() ? entry.wordZh : existingWordZh;
  const nextWordJa =
    typeof entry.wordJa === "string" && entry.wordJa.trim() ? entry.wordJa : existingWordJa;
  const nextWordEn =
    typeof entry.wordEn === "string" && entry.wordEn.trim() ? entry.wordEn : existingWordEn;
  const nextDefinitionEn =
    typeof entry.definitionEn === "string" && entry.definitionEn.trim() ? entry.definitionEn : existingDefinitionEn;
  const nextDefinitionZh =
    typeof entry.definitionZh === "string" && entry.definitionZh.trim() ? entry.definitionZh : existingDefinitionZh;
  const nextDefinitionJa =
    typeof entry.definitionJa === "string" && entry.definitionJa.trim() ? entry.definitionJa : existingDefinitionJa;
  const nextTranslatedDefinitionEn =
    typeof entry.translatedDefinitionEn === "string" && entry.translatedDefinitionEn.trim() ? entry.translatedDefinitionEn : existingTranslatedDefinitionEn;
  const nextTranslatedDefinitionZh =
    typeof entry.translatedDefinitionZh === "string" && entry.translatedDefinitionZh.trim() ? entry.translatedDefinitionZh : existingTranslatedDefinitionZh;
  const nextTranslatedDefinitionJa =
    typeof entry.translatedDefinitionJa === "string" && entry.translatedDefinitionJa.trim() ? entry.translatedDefinitionJa : existingTranslatedDefinitionJa;
  const nextEntry: WordEntry = {
    ...entry,
    queryCount: existing ? existing.queryCount + 1 : 1,
    lastQueriedAt: new Date().toISOString(),
    wordZh: nextWordZh ?? undefined,
    wordJa: nextWordJa ?? undefined,
    wordEn: nextWordEn ?? undefined,
    definitionEn: nextDefinitionEn ?? undefined,
    definitionZh: nextDefinitionZh ?? undefined,
    definitionJa: nextDefinitionJa ?? undefined,
    translatedDefinitionEn: nextTranslatedDefinitionEn ?? undefined,
    translatedDefinitionZh: nextTranslatedDefinitionZh ?? undefined,
    translatedDefinitionJa: nextTranslatedDefinitionJa ?? undefined,
    highlightDisabled: existingHighlightDisabled
  };

  const nextStore: StorageEnvelope = {
    ...store,
    wordsByKey: {
      ...store.wordsByKey,
      [entry.normalizedWord]: nextEntry
    }
  };

  await writeStore(nextStore);
  return nextEntry;
};

export const updateWordZh = async (normalizedWord: string, wordZh: string): Promise<void> => {
  const normalized = typeof normalizedWord === "string" ? normalizedWord.trim() : "";
  const raw = typeof wordZh === "string" ? wordZh : "";
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!normalized || !trimmed) {
    return;
  }

  const clamped = trimmed.length > 64 ? trimmed.slice(0, 64).trim() : trimmed;
  if (!clamped) {
    return;
  }

  const store = await readStore();
  const existing = store.wordsByKey[normalized];
  if (!existing) {
    return;
  }

  if (existing.wordZh === clamped) {
    return;
  }

  const nextStore: StorageEnvelope = {
    ...store,
    wordsByKey: {
      ...store.wordsByKey,
      [normalized]: {
        ...existing,
        wordZh: clamped
      }
    }
  };

  await writeStore(nextStore);
};

export const updateWordJa = async (normalizedWord: string, wordJa: string): Promise<void> => {
  const normalized = typeof normalizedWord === "string" ? normalizedWord.trim() : "";
  const raw = typeof wordJa === "string" ? wordJa : "";
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!normalized || !trimmed) {
    return;
  }

  const clamped = trimmed.length > 64 ? trimmed.slice(0, 64).trim() : trimmed;
  if (!clamped) {
    return;
  }

  const store = await readStore();
  const existing = store.wordsByKey[normalized];
  if (!existing) {
    return;
  }

  if (existing.wordJa === clamped) {
    return;
  }

  const nextStore: StorageEnvelope = {
    ...store,
    wordsByKey: {
      ...store.wordsByKey,
      [normalized]: {
        ...existing,
        wordJa: clamped
      }
    }
  };

  await writeStore(nextStore);
};

export const updateWordEn = async (normalizedWord: string, wordEn: string): Promise<void> => {
  const normalized = typeof normalizedWord === "string" ? normalizedWord.trim() : "";
  const raw = typeof wordEn === "string" ? wordEn : "";
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!normalized || !trimmed) {
    return;
  }

  const clamped = trimmed.length > 64 ? trimmed.slice(0, 64).trim() : trimmed;
  if (!clamped) {
    return;
  }

  const store = await readStore();
  const existing = store.wordsByKey[normalized];
  if (!existing) {
    return;
  }

  if (existing.wordEn === clamped) {
    return;
  }

  const nextStore: StorageEnvelope = {
    ...store,
    wordsByKey: {
      ...store.wordsByKey,
      [normalized]: {
        ...existing,
        wordEn: clamped
      }
    }
  };

  await writeStore(nextStore);
};

export const updateDefinitionEn = async (normalizedWord: string, definitionEn: string): Promise<void> => {
  const normalized = typeof normalizedWord === "string" ? normalizedWord.trim() : "";
  const raw = typeof definitionEn === "string" ? definitionEn : "";
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!normalized || !trimmed) {
    return;
  }

  const clamped = trimmed.length > 500 ? trimmed.slice(0, 500).trim() : trimmed;
  if (!clamped) {
    return;
  }

  const store = await readStore();
  const existing = store.wordsByKey[normalized];
  if (!existing) {
    return;
  }

  if (existing.definitionEn === clamped) {
    return;
  }

  const nextStore: StorageEnvelope = {
    ...store,
    wordsByKey: {
      ...store.wordsByKey,
      [normalized]: {
        ...existing,
        definitionEn: clamped
      }
    }
  };

  await writeStore(nextStore);
};

export const updateDefinitionZh = async (normalizedWord: string, definitionZh: string): Promise<void> => {
  const normalized = typeof normalizedWord === "string" ? normalizedWord.trim() : "";
  const raw = typeof definitionZh === "string" ? definitionZh : "";
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!normalized || !trimmed) {
    return;
  }

  const clamped = trimmed.length > 500 ? trimmed.slice(0, 500).trim() : trimmed;
  if (!clamped) {
    return;
  }

  const store = await readStore();
  const existing = store.wordsByKey[normalized];
  if (!existing) {
    return;
  }

  if (existing.definitionZh === clamped) {
    return;
  }

  const nextStore: StorageEnvelope = {
    ...store,
    wordsByKey: {
      ...store.wordsByKey,
      [normalized]: {
        ...existing,
        definitionZh: clamped
      }
    }
  };

  await writeStore(nextStore);
};

export const updateDefinitionJa = async (normalizedWord: string, definitionJa: string): Promise<void> => {
  const normalized = typeof normalizedWord === "string" ? normalizedWord.trim() : "";
  const raw = typeof definitionJa === "string" ? definitionJa : "";
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!normalized || !trimmed) {
    return;
  }

  const clamped = trimmed.length > 500 ? trimmed.slice(0, 500).trim() : trimmed;
  if (!clamped) {
    return;
  }

  const store = await readStore();
  const existing = store.wordsByKey[normalized];
  if (!existing) {
    return;
  }

  if (existing.definitionJa === clamped) {
    return;
  }

  const nextStore: StorageEnvelope = {
    ...store,
    wordsByKey: {
      ...store.wordsByKey,
      [normalized]: {
        ...existing,
        definitionJa: clamped
      }
    }
  };

  await writeStore(nextStore);
};

export const updateTranslatedDefinitionEn = async (normalizedWord: string, translatedDefinitionEn: string): Promise<void> => {
  const normalized = typeof normalizedWord === "string" ? normalizedWord.trim() : "";
  const raw = typeof translatedDefinitionEn === "string" ? translatedDefinitionEn : "";
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!normalized || !trimmed) {
    return;
  }

  const clamped = trimmed.length > 500 ? trimmed.slice(0, 500).trim() : trimmed;
  if (!clamped) {
    return;
  }

  const store = await readStore();
  const existing = store.wordsByKey[normalized];
  if (!existing) {
    return;
  }

  if (existing.translatedDefinitionEn === clamped) {
    return;
  }

  const nextStore: StorageEnvelope = {
    ...store,
    wordsByKey: {
      ...store.wordsByKey,
      [normalized]: {
        ...existing,
        translatedDefinitionEn: clamped
      }
    }
  };

  await writeStore(nextStore);
};

export const updateTranslatedDefinitionZh = async (normalizedWord: string, translatedDefinitionZh: string): Promise<void> => {
  const normalized = typeof normalizedWord === "string" ? normalizedWord.trim() : "";
  const raw = typeof translatedDefinitionZh === "string" ? translatedDefinitionZh : "";
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!normalized || !trimmed) {
    return;
  }

  const clamped = trimmed.length > 500 ? trimmed.slice(0, 500).trim() : trimmed;
  if (!clamped) {
    return;
  }

  const store = await readStore();
  const existing = store.wordsByKey[normalized];
  if (!existing) {
    return;
  }

  if (existing.translatedDefinitionZh === clamped) {
    return;
  }

  const nextStore: StorageEnvelope = {
    ...store,
    wordsByKey: {
      ...store.wordsByKey,
      [normalized]: {
        ...existing,
        translatedDefinitionZh: clamped
      }
    }
  };

  await writeStore(nextStore);
};

export const updateTranslatedDefinitionJa = async (normalizedWord: string, translatedDefinitionJa: string): Promise<void> => {
  const normalized = typeof normalizedWord === "string" ? normalizedWord.trim() : "";
  const raw = typeof translatedDefinitionJa === "string" ? translatedDefinitionJa : "";
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!normalized || !trimmed) {
    return;
  }

  const clamped = trimmed.length > 500 ? trimmed.slice(0, 500).trim() : trimmed;
  if (!clamped) {
    return;
  }

  const store = await readStore();
  const existing = store.wordsByKey[normalized];
  if (!existing) {
    return;
  }

  if (existing.translatedDefinitionJa === clamped) {
    return;
  }

  const nextStore: StorageEnvelope = {
    ...store,
    wordsByKey: {
      ...store.wordsByKey,
      [normalized]: {
        ...existing,
        translatedDefinitionJa: clamped
      }
    }
  };

  await writeStore(nextStore);
};

export type DeleteWordResult = {
  fullyDeleted: boolean;
  remainingTranslations: string[];
};

export const deleteWordEntry = async (
  normalizedWord: string,
  direction?: string
): Promise<DeleteWordResult> => {
  const store = await readStore();
  const existing = store.wordsByKey[normalizedWord];
  if (!existing) {
    return { fullyDeleted: true, remainingTranslations: [] };
  }

  // If no direction specified, delete the entire entry (backward compatibility)
  if (!direction) {
    const nextWords = { ...store.wordsByKey };
    delete nextWords[normalizedWord];
    await writeStore({ ...store, wordsByKey: nextWords });
    return { fullyDeleted: true, remainingTranslations: [] };
  }

  // Determine which fields to clear based on direction
  const updated = { ...existing };

  if (direction === "EN->ZH" || direction === "EN<->ZH") {
    updated.wordZh = undefined;
    updated.definitionZh = undefined;
  } else if (direction === "ZH->EN") {
    updated.wordEn = undefined;
    updated.definitionEn = undefined;
  } else if (direction === "EN->JA" || direction === "EN<->JA") {
    updated.wordJa = undefined;
    updated.definitionJa = undefined;
  } else if (direction === "JA->EN") {
    updated.wordEn = undefined;
    updated.definitionEn = undefined;
  } else if (direction === "ZH->JA" || direction === "ZH<->JA") {
    updated.wordJa = undefined;
    updated.definitionJa = undefined;
  } else if (direction === "JA->ZH") {
    updated.wordZh = undefined;
    updated.definitionZh = undefined;
  }

  // Check if any translations remain
  const remainingTranslations: string[] = [];
  if (updated.wordZh) remainingTranslations.push("ZH");
  if (updated.wordJa) remainingTranslations.push("JA");
  if (updated.wordEn) remainingTranslations.push("EN");

  // If no translations remain, delete the entire entry
  if (remainingTranslations.length === 0) {
    const nextWords = { ...store.wordsByKey };
    delete nextWords[normalizedWord];
    await writeStore({ ...store, wordsByKey: nextWords });
    return { fullyDeleted: true, remainingTranslations: [] };
  }

  // Otherwise, update the entry with cleared fields
  const nextStore: StorageEnvelope = {
    ...store,
    wordsByKey: {
      ...store.wordsByKey,
      [normalizedWord]: updated
    }
  };

  await writeStore(nextStore);
  return { fullyDeleted: false, remainingTranslations };
};

export const setWordHighlightDisabled = async (
  normalizedWord: string,
  highlightDisabled: boolean
): Promise<WordEntry | null> => {
  const store = await readStore();
  const existing = store.wordsByKey[normalizedWord];
  if (!existing) {
    return null;
  }

  const nextEntry: WordEntry = {
    ...existing,
    highlightDisabled
  };

  const nextStore: StorageEnvelope = {
    ...store,
    wordsByKey: {
      ...store.wordsByKey,
      [normalizedWord]: nextEntry
    }
  };

  await writeStore(nextStore);
  return nextEntry;
};

const normalizeHighlightWord = (raw: string): string | null => {
  if (!raw) {
    return null;
  }
  return normalizeWord(raw) ?? raw.trim();
};

export const addHighlightOnlyWord = async (rawWord: string): Promise<string[]> => {
  const normalizedWord = normalizeHighlightWord(rawWord);
  if (!normalizedWord) {
    return [];
  }

  const store = await readStore();
  const existing = Array.isArray(store.highlightOnlyWords) ? store.highlightOnlyWords : [];
  if (existing.includes(normalizedWord)) {
    return existing;
  }
  const next = [...existing, normalizedWord];
  await writeStore({ ...store, highlightOnlyWords: next });
  return next;
};

export const removeHighlightOnlyWord = async (rawWord: string): Promise<string[]> => {
  const normalizedWord = normalizeHighlightWord(rawWord);
  if (!normalizedWord) {
    return [];
  }

  const store = await readStore();
  const existing = Array.isArray(store.highlightOnlyWords) ? store.highlightOnlyWords : [];
  if (!existing.includes(normalizedWord)) {
    return existing;
  }
  const next = existing.filter((word) => word !== normalizedWord);
  await writeStore({ ...store, highlightOnlyWords: next });
  return next;
};

export const addHighlightMutedWord = async (rawWord: string): Promise<string[]> => {
  const normalizedWord = normalizeHighlightWord(rawWord);
  if (!normalizedWord) {
    return [];
  }

  const store = await readStore();
  const existing = Array.isArray(store.highlightMutedWords) ? store.highlightMutedWords : [];
  if (existing.includes(normalizedWord)) {
    return existing;
  }
  const next = [...existing, normalizedWord];
  await writeStore({ ...store, highlightMutedWords: next });
  return next;
};

export const removeHighlightMutedWord = async (rawWord: string): Promise<string[]> => {
  const normalizedWord = normalizeHighlightWord(rawWord);
  if (!normalizedWord) {
    return [];
  }

  const store = await readStore();
  const existing = Array.isArray(store.highlightMutedWords) ? store.highlightMutedWords : [];
  if (!existing.includes(normalizedWord)) {
    return existing;
  }
  const next = existing.filter((word) => word !== normalizedWord);
  await writeStore({ ...store, highlightMutedWords: next });
  return next;
};


export const __resetMemoryStore = (): void => {
  memoryStore.data = createEmptyStorage();
};
