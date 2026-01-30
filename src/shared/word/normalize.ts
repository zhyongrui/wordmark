export type WordLanguage = "en" | "zh" | "ja";

const ENGLISH_TOKEN_PATTERN = /^[A-Za-z]+(?:['-][A-Za-z]+)*$/;
const HAN_TOKEN_PATTERN = /^\p{Script=Han}+$/u;
const JAPANESE_KANA_PATTERNS = /[\p{Script=Hiragana}\p{Script=Katakana}\u30FC]/u;
const JAPANESE_TOKEN_PATTERN = new RegExp(
  `^(?=.*${JAPANESE_KANA_PATTERNS.source})(?:${[
    "\\p{Script=Hiragana}",
    "\\p{Script=Katakana}",
    "\\p{Script=Han}",
    "\\u30FC"
  ].join("|")})+$`,
  "u"
);

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

  if (JAPANESE_TOKEN_PATTERN.test(trimmed)) {
    return { normalizedWord: trimmed, language: "ja" };
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
