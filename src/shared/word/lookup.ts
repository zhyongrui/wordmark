export type LookupInput = {
  normalizedWord: string;
  displayWord: string;
  ttsAvailable: boolean;
};

export type LookupResult = {
  normalizedWord: string;
  displayWord: string;
  pronunciationAvailable: boolean;
};

export const shapeLookupResult = (input: LookupInput): LookupResult => ({
  normalizedWord: input.normalizedWord,
  displayWord: input.displayWord.trim(),
  pronunciationAvailable: Boolean(input.ttsAvailable)
});
