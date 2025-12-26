import { migrateStorage } from "../storage/migrate";
import { createEmptyStorage, StorageEnvelope, WordEntry } from "../storage/schema";

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
  const nextEntry: WordEntry = {
    ...entry,
    queryCount: existing ? existing.queryCount + 1 : 1,
    lastQueriedAt: new Date().toISOString(),
    definition: entry.definition ?? null
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

export const deleteWordEntry = async (normalizedWord: string): Promise<void> => {
  const store = await readStore();
  if (!store.wordsByKey[normalizedWord]) {
    return;
  }

  const nextWords = { ...store.wordsByKey };
  delete nextWords[normalizedWord];
  await writeStore({ ...store, wordsByKey: nextWords });
};

export const __resetMemoryStore = (): void => {
  memoryStore.data = createEmptyStorage();
};
