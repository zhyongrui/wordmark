export const SCHEMA_VERSION = 1;

export type WordEntry = {
  normalizedWord: string;
  displayWord: string;
  wordZh?: string;
  queryCount: number;
  lastQueriedAt: string;
  definition?: string | null;
  pronunciationAvailable: boolean;
};

export type Preferences = {
  highlightEnabled: boolean;
};

export type StorageEnvelope = {
  schemaVersion: number;
  wordsByKey: Record<string, WordEntry>;
  preferences: Preferences;
  updatedAt: string;
};

export const createEmptyStorage = (): StorageEnvelope => ({
  schemaVersion: SCHEMA_VERSION,
  wordsByKey: {},
  preferences: { highlightEnabled: true },
  updatedAt: new Date(0).toISOString()
});
