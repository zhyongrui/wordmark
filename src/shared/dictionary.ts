import dictionaryData from "../assets/dictionary-basic.json";

export type DictionaryEntry = {
  definition: string;
  pronunciationAvailable: boolean;
};

const dictionary = dictionaryData as Record<string, DictionaryEntry>;

export const lookupDictionary = (normalized: string): DictionaryEntry | null =>
  dictionary[normalized] ?? null;
