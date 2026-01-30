export const SCHEMA_VERSION = 3;

export type WordEntry = {
  normalizedWord: string;
  displayWord: string;
  wordZh?: string;
  wordJa?: string;
  wordEn?: string;
  definitionEn?: string;
  definitionZh?: string;
  definitionJa?: string;
  queryCount: number;
  lastQueriedAt: string;
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
