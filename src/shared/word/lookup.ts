export type DictionaryEntry = {
  definition: string;
  pronunciationAvailable: boolean;
};

export type LookupInput = {
  normalizedWord: string;
  displayWord: string;
  dictionaryEntry: DictionaryEntry | null;
  ttsAvailable: boolean;
};

export type LookupResult = {
  normalizedWord: string;
  displayWord: string;
  definition: string | null;
  pronunciationAvailable: boolean;
};

export const shapeLookupResult = (input: LookupInput): LookupResult => ({
  normalizedWord: input.normalizedWord,
  displayWord: input.displayWord.trim(),
  definition: input.dictionaryEntry?.definition ?? null,
  pronunciationAvailable: Boolean(input.ttsAvailable)
});
