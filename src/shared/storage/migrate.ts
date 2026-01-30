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
          migratedWords[key] = rest;
        }
      }
    }
    return {
      ...createEmptyStorage(),
      ...data,
      schemaVersion: SCHEMA_VERSION,
      wordsByKey: migratedWords,
      preferences: data.preferences ?? { highlightEnabled: true }
    };
  }

  if (data.schemaVersion === 1) {
    return {
      ...createEmptyStorage(),
      ...data,
      schemaVersion: SCHEMA_VERSION,
      wordsByKey: data.wordsByKey ?? {},
      preferences: data.preferences ?? { highlightEnabled: true }
    };
  }

  return createEmptyStorage();
};
