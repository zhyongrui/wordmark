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
