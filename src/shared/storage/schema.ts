export const SCHEMA_VERSION = 6;

export type WordEntry = {
  normalizedWord: string;
  displayWord: string;
  wordZh?: string;
  wordJa?: string;
  wordEn?: string;
  // Same-language definitions (source language definition of the word)
  definitionEn?: string;
  definitionZh?: string;
  definitionJa?: string;
  // Translated definitions (translation of the definition from source to target language)
  translatedDefinitionEn?: string;
  translatedDefinitionZh?: string;
  translatedDefinitionJa?: string;
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
