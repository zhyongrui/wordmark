import { createEmptyStorage, SCHEMA_VERSION, StorageEnvelope } from "./schema";

export const migrateStorage = (input: unknown): StorageEnvelope => {
  if (!input || typeof input !== "object") {
    return createEmptyStorage();
  }

  const data = input as Partial<StorageEnvelope>;
  if (data.schemaVersion === SCHEMA_VERSION) {
    return {
      ...createEmptyStorage(),
      ...data,
      wordsByKey: data.wordsByKey ?? {},
      highlightOnlyWords: Array.isArray(data.highlightOnlyWords)
        ? (data.highlightOnlyWords.filter((word) => typeof word === "string") as string[])
        : [],
      highlightMutedWords: Array.isArray(data.highlightMutedWords)
        ? (data.highlightMutedWords.filter((word) => typeof word === "string") as string[])
        : [],
      preferences: data.preferences ?? { highlightEnabled: true }
    };
  }

  // Migrate from version 4 to 5: add highlight-muted list
  if (data.schemaVersion === 4) {
    return {
      ...createEmptyStorage(),
      ...data,
      schemaVersion: SCHEMA_VERSION,
      wordsByKey: data.wordsByKey ?? {},
      highlightOnlyWords: Array.isArray(data.highlightOnlyWords)
        ? (data.highlightOnlyWords.filter((word) => typeof word === "string") as string[])
        : [],
      highlightMutedWords: [],
      preferences: data.preferences ?? { highlightEnabled: true }
    };
  }

  // Migrate from version 3 to 4: add highlight-only list
  if (data.schemaVersion === 3) {
    return {
      ...createEmptyStorage(),
      ...data,
      schemaVersion: SCHEMA_VERSION,
      wordsByKey: data.wordsByKey ?? {},
      highlightOnlyWords: [],
      highlightMutedWords: [],
      preferences: data.preferences ?? { highlightEnabled: true }
    };
  }

  // Migrate from version 2 to 3: remove old definition field
  if (data.schemaVersion === 2) {
    const migratedWords: Record<string, unknown> = {};
    if (data.wordsByKey && typeof data.wordsByKey === "object") {
      for (const [key, entry] of Object.entries(data.wordsByKey)) {
        if (entry && typeof entry === "object") {
          const { definition: _removed, ...rest } = entry as { definition?: unknown };
          void _removed;
          migratedWords[key] = rest;
        }
      }
    }
    return {
      ...createEmptyStorage(),
      ...data,
      schemaVersion: SCHEMA_VERSION,
      wordsByKey: migratedWords,
      highlightOnlyWords: [],
      highlightMutedWords: [],
      preferences: data.preferences ?? { highlightEnabled: true }
    };
  }

  if (data.schemaVersion === 1) {
    return {
      ...createEmptyStorage(),
      ...data,
      schemaVersion: SCHEMA_VERSION,
      wordsByKey: data.wordsByKey ?? {},
      highlightOnlyWords: [],
      highlightMutedWords: [],
      preferences: data.preferences ?? { highlightEnabled: true }
    };
  }

  return createEmptyStorage();
};
