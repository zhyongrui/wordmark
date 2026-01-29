import type { WordLanguage } from "../word/normalize";
import type { TranslationTargetLang } from "./types";
import type { TranslationDirection, TranslationDualPair } from "./settings";

type DirectionDetails = {
  source: WordLanguage;
  target: TranslationTargetLang;
};

const LANGUAGE_CODE_UPPER: Record<WordLanguage, "EN" | "ZH" | "JA"> = {
  en: "EN",
  zh: "ZH",
  ja: "JA"
};

const LANGUAGE_DISPLAY_NAME: Record<WordLanguage, string> = {
  en: "English",
  zh: "Chinese (Simplified)",
  ja: "Japanese"
};

const DIRECTION_DETAILS: Record<TranslationDirection, DirectionDetails> = {
  "EN->ZH": { source: "en", target: "zh" },
  "ZH->EN": { source: "zh", target: "en" },
  "EN->JA": { source: "en", target: "ja" },
  "JA->EN": { source: "ja", target: "en" },
  "ZH->JA": { source: "zh", target: "ja" },
  "JA->ZH": { source: "ja", target: "zh" }
};

const DIRECTION_BY_LANG_PAIR: Record<string, TranslationDirection> = Object.entries(DIRECTION_DETAILS).reduce(
  (acc, [direction, details]) => ({
    ...acc,
    [`${details.source}:${details.target}`]: direction as TranslationDirection
  }),
  {}
) as Record<string, TranslationDirection>;

const DUAL_PAIR_DIRECTIONS: Record<TranslationDualPair, [TranslationDirection, TranslationDirection]> = {
  "EN<->ZH": ["EN->ZH", "ZH->EN"],
  "EN<->JA": ["EN->JA", "JA->EN"],
  "ZH<->JA": ["ZH->JA", "JA->ZH"]
};

const DUAL_PAIR_LANGUAGES: Record<TranslationDualPair, [WordLanguage, WordLanguage]> = {
  "EN<->ZH": ["en", "zh"],
  "EN<->JA": ["en", "ja"],
  "ZH<->JA": ["zh", "ja"]
};

export const getDirectionDetails = (direction: TranslationDirection): DirectionDetails => {
  return DIRECTION_DETAILS[direction];
};

export const getDirectionFromLanguages = (
  source: WordLanguage,
  target: TranslationTargetLang
): TranslationDirection | null => {
  return DIRECTION_BY_LANG_PAIR[`${source}:${target}`] ?? null;
};

export const getDualPairDirections = (pair: TranslationDualPair): [TranslationDirection, TranslationDirection] => {
  return DUAL_PAIR_DIRECTIONS[pair];
};

export const getDualPairLanguages = (pair: TranslationDualPair): [WordLanguage, WordLanguage] => {
  return DUAL_PAIR_LANGUAGES[pair];
};

export const getOppositeDirection = (direction: TranslationDirection): TranslationDirection => {
  for (const directions of Object.values(DUAL_PAIR_DIRECTIONS)) {
    if (directions[0] === direction) {
      return directions[1];
    }
    if (directions[1] === direction) {
      return directions[0];
    }
  }
  return direction;
};

export const formatDirectionLabel = (direction: TranslationDirection): string => {
  const details = getDirectionDetails(direction);
  return `${LANGUAGE_CODE_UPPER[details.source]}→${LANGUAGE_CODE_UPPER[details.target]}`;
};

export const getLanguageCode = (language: WordLanguage): "EN" | "ZH" | "JA" => {
  return LANGUAGE_CODE_UPPER[language];
};

export const getLanguageDisplayName = (language: WordLanguage): string => {
  return LANGUAGE_DISPLAY_NAME[language];
};

export const isDirectionSource = (direction: TranslationDirection, language: WordLanguage): boolean => {
  return getDirectionDetails(direction).source === language;
};

export const isDirectionTarget = (direction: TranslationDirection, language: TranslationTargetLang): boolean => {
  return getDirectionDetails(direction).target === language;
};

export const formatDualPairLabel = (pair: TranslationDualPair): string => {
  return pair.replace("<->", "↔");
};
