import { createEmptyStorage, SCHEMA_VERSION, StorageEnvelope } from "./schema";

export const migrateStorage = (input: unknown): StorageEnvelope => {
  if (!input || typeof input !== "object") {
    return createEmptyStorage();
  }

  const data = input as Partial<StorageEnvelope>;
  if (data.schemaVersion !== SCHEMA_VERSION) {
    return createEmptyStorage();
  }

  return {
    ...createEmptyStorage(),
    ...data,
    wordsByKey: data.wordsByKey ?? {},
    preferences: data.preferences ?? { highlightEnabled: true }
  };
};
