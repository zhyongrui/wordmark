export type WordLanguage = "en" | "zh";

const ENGLISH_TOKEN_PATTERN = /^[A-Za-z]+(?:['-][A-Za-z]+)*$/;
const HAN_TOKEN_PATTERN = /^\p{Script=Han}+$/u;

export type NormalizedSelection = {
  normalizedWord: string;
  language: WordLanguage;
};

export const normalizeSelection = (raw: string): NormalizedSelection | null => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (HAN_TOKEN_PATTERN.test(trimmed)) {
    return { normalizedWord: trimmed, language: "zh" };
  }

  if (ENGLISH_TOKEN_PATTERN.test(trimmed)) {
    return { normalizedWord: trimmed.toLowerCase(), language: "en" };
  }

  return null;
};

export const normalizeWord = (raw: string): string | null => {
  return normalizeSelection(raw)?.normalizedWord ?? null;
};

export const detectWordLanguage = (raw: string): WordLanguage | null => {
  return normalizeSelection(raw)?.language ?? null;
};
