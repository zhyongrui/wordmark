export const SCHEMA_VERSION = 5;

export type WordEntry = {
  normalizedWord: string;
  displayWord: string;
  wordZh?: string;
  wordJa?: string;
  wordEn?: string;
  definitionEn?: string;
  definitionZh?: string;
  definitionJa?: string;
  highlightDisabled?: boolean;
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
  highlightOnlyWords: string[];
  highlightMutedWords: string[];
  preferences: Preferences;
  updatedAt: string;
};

export const createEmptyStorage = (): StorageEnvelope => ({
  schemaVersion: SCHEMA_VERSION,
  wordsByKey: {},
  highlightOnlyWords: [],
  highlightMutedWords: [],
  preferences: { highlightEnabled: true },
  updatedAt: new Date(0).toISOString()
});
