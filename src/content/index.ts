import { MessageTypes, type DefinitionBackfillResponse, type DefinitionSource } from "../shared/messages";
import {
  bumpAutoCloseIgnore,
  captureSelectionRect,
  getCachedSelectionRect,
  hideLookupOverlay,
  installSelectionRectTracking,
  isOverlayOpen,
  overlayContainsTarget,
  setWordSaveToggleHandler,
  setWordHighlightToggleHandler,
  setWordSaveEnabled,
  setWordHighlightEnabled,
  setOverlayHideListener,
  shouldIgnoreAutoClose,
  resetTranslationUi,
  showGeneratedDefinitionError,
  showGeneratedDefinitionLoading,
  showGeneratedDefinitionResult,
  showTranslationError,
  showTranslationLoading,
  showLookupOverlay,
  showTranslationResult,
  showNotice
} from "./lookup-overlay";
import { canPronounce, playPronunciation } from "./pronounce";
import { createHighlightEngine } from "./highlight";
import type { Preferences, WordEntry } from "../shared/storage/schema";
import {
  formatDirectionLabel,
  formatDualPairLabel,
  getDirectionDetails,
  getDirectionFromLanguages,
  getDualPairLanguages,
  getLanguageDisplayName,
  getOppositeDirection
} from "../shared/translation/directions";
import { readTranslationSettings, TRANSLATION_SETTINGS_KEY } from "../shared/translation/settings";
import type { TranslationResponse, TranslationTargetLang } from "../shared/translation/types";
import { detectWordLanguage, normalizeWord, type WordLanguage } from "../shared/word/normalize";

type LookupResponse =
  | {
      ok: true;
      entry: {
        normalizedWord: string;
        displayWord: string;
        definitionEn?: string;
        definitionZh?: string;
        definitionJa?: string;
        definitionSource: DefinitionSource;
        pronunciationAvailable: boolean;
        highlightDisabled?: boolean;
      };
      wasExisting: boolean;
      savedByLookup: boolean;
      previousEntry: WordEntry | null;
    }
  | { ok: false; error: string };

type WordsResponse =
  | { ok: true; words: WordEntry[]; highlightOnlyWords: string[]; highlightMutedWords: string[] }
  | { ok: false; error: string };

type AddWordResponse =
  | { ok: true; entry: WordEntry }
  | { ok: false; error: "invalid-payload" | "invalid-selection" | "unknown" };

type DeleteWordResponse =
  | { ok: true; fullyDeleted: boolean; remainingTranslations: string[] }
  | { ok: false; error: "invalid-payload" | "unknown" };

type RestoreWordResponse =
  | { ok: true; entry: WordEntry | null }
  | { ok: false; error: "invalid-payload" | "unknown" };

type SetWordHighlightResponse =
  | { ok: true; entry: WordEntry }
  | { ok: false; error: "invalid-payload" | "not_found" | "unknown" };

type HighlightOnlyResponse =
  | { ok: true; highlightOnlyWords: string[] }
  | { ok: false; error: "invalid-payload" | "unknown" };

type HighlightMutedResponse =
  | { ok: true; highlightMutedWords: string[] }
  | { ok: false; error: "invalid-payload" | "unknown" };

type PreferencesResponse =
  | { ok: true; preferences: Preferences }
  | { ok: false; error: string };

const STORAGE_KEY = "wordmark:storage";
const highlightEngine = createHighlightEngine();
let highlightEnabled = true;
let listHighlightWords = new Set<string>();
let highlightOnlyWords = new Set<string>();
let highlightMutedWords = new Set<string>();
let currentLookupHighlightOverride: boolean | null = null;
let currentLookupHighlightDefault: boolean | null = null;
let currentLookupHighlightSetting = true;
let currentLookupNormalizedWord: string | null = null;
let currentLookupSaveOverride: boolean | null = null;
let currentLookupWasExisting = false;
let currentLookupSavedByLookup = false;
let currentLookupPreviousEntry: WordEntry | null = null;
let lookupSessionId = 0;
let translationEnabled = false;
let definitionBackfillEnabled = false;
let definitionTranslationEnabled = false;
let latestLookup:
  | {
      sessionId: number;
      normalizedWord: string;
      word: string;
      definitionEn?: string;
      definitionZh?: string;
      definitionJa?: string;
      language: WordLanguage;
      pronunciationAvailable: boolean;
    }
  | null = null;

const getDefinitionBackfillErrorMessage = (error: Exclude<DefinitionBackfillResponse, { ok: true }>["error"]) => {
  switch (error) {
    case "disabled":
      return "Definition backfill is disabled.";
    case "offline":
      return "Definition unavailable (offline).";
    case "quota_exceeded":
      return "Definition unavailable (quota exceeded).";
    case "timeout":
      return "Definition request timed out.";
    case "provider_error":
      return "Definition unavailable.";
    case "not_configured":
      return "Definition not configured. Set an API key in Options.";
  }
};

const getDefinitionForLanguage = (
  entry: { definitionEn?: string; definitionZh?: string; definitionJa?: string },
  language: WordLanguage
): string | null => {
  if (language === "en" && entry.definitionEn) {
    return entry.definitionEn;
  }
  if (language === "zh" && entry.definitionZh) {
    return entry.definitionZh;
  }
  if (language === "ja" && entry.definitionJa) {
    return entry.definitionJa;
  }
  return null;
};

type ExistingTranslationData = {
  hasWordTranslation: boolean;
  hasDefinitionTranslation: boolean;
  translation?: string;
  definitionTranslation?: string;
};

const checkExistingTranslation = (
  entry: {
    wordZh?: string;
    wordEn?: string;
    wordJa?: string;
    definitionEn?: string;
    definitionZh?: string;
    definitionJa?: string;
    translatedDefinitionEn?: string;
    translatedDefinitionZh?: string;
    translatedDefinitionJa?: string;
  },
  sourceLang: WordLanguage,
  targetLang?: TranslationTargetLang
): ExistingTranslationData => {
  if (!targetLang) {
    return { hasWordTranslation: false, hasDefinitionTranslation: false };
  }

  // Check if we have the target language word translation
  let translation: string | undefined;
  if (targetLang === "zh" && entry.wordZh) {
    translation = entry.wordZh;
  } else if (targetLang === "en" && entry.wordEn) {
    translation = entry.wordEn;
  } else if (targetLang === "ja" && entry.wordJa) {
    translation = entry.wordJa;
  }

  // Check if we have the target language definition translation (translated definition, not same-language definition)
  let definitionTranslation: string | undefined;
  if (targetLang === "zh" && entry.translatedDefinitionZh) {
    definitionTranslation = entry.translatedDefinitionZh;
  } else if (targetLang === "en" && entry.translatedDefinitionEn) {
    definitionTranslation = entry.translatedDefinitionEn;
  } else if (targetLang === "ja" && entry.translatedDefinitionJa) {
    definitionTranslation = entry.translatedDefinitionJa;
  }

  // Separate flags for word translation and definition translation
  const hasWordTranslation = Boolean(translation);
  const hasDefinitionTranslation = Boolean(definitionTranslation);

  return { hasWordTranslation, hasDefinitionTranslation, translation, definitionTranslation };
};

const sendMessage = async <T>(message: unknown): Promise<T | null> => {
  if (!chrome?.runtime?.sendMessage) {
    return null;
  }

  try {
    const result = chrome.runtime.sendMessage(message);
    if (result && typeof (result as Promise<T>).then === "function") {
      return await (result as Promise<T>);
    }

    return await new Promise<T>((resolve) => {
      chrome.runtime.sendMessage(message, (response) => resolve(response as T));
    });
  } catch {
    return null;
  }
};

const triggerLookup = async () => {
  const translationSettingsPromise = readTranslationSettings().catch(() => ({
    enabled: false,
    providerId: "gemini",
    mode: "single",
    singleDirection: "EN->ZH",
    dualPair: "EN<->ZH",
    lastDirection: "EN->ZH",
    definitionBackfillEnabled: false,
    definitionTranslationEnabled: false
  }));
  const selection = window.getSelection()?.toString() ?? "";
  const selectionLanguage = detectWordLanguage(selection);
  if (!selectionLanguage) {
    ensureOverlayAutoClose();
    showNotice("Select a single word to look up.");
    return;
  }

  const settings = await translationSettingsPromise;
  translationEnabled = Boolean(settings.enabled);
  definitionBackfillEnabled = Boolean(settings.definitionBackfillEnabled);
  definitionTranslationEnabled = Boolean(settings.definitionTranslationEnabled);
  currentLookupHighlightSetting = settings.highlightQueriedWords;

  let directionInfo:
    | {
        targetLang: TranslationTargetLang;
      }
    | null = null;
  if (translationEnabled) {
    if (settings.mode === "single") {
      const directionLabel = settings.singleDirection;
      const details = getDirectionDetails(directionLabel);
      if (details.source !== selectionLanguage) {
        ensureOverlayAutoClose();
        showNotice(
          `当前为 ${formatDirectionLabel(directionLabel)} 模式，请到设置切换为 ${formatDirectionLabel(
            getOppositeDirection(directionLabel)
          )} 或开启双向翻译模式`
        );
        return;
      }
      directionInfo = { targetLang: details.target };
    } else {
      const pairLanguages = getDualPairLanguages(settings.dualPair);
      if (!pairLanguages.includes(selectionLanguage)) {
        ensureOverlayAutoClose();
        showNotice(
          `当前为 ${formatDualPairLabel(settings.dualPair)} 模式，暂不支持 ${getLanguageDisplayName(
            selectionLanguage
          )} 语言的查词。请切换到包含该语言的语言对。`
        );
        return;
      }
      const targetLang = pairLanguages[0] === selectionLanguage ? pairLanguages[1] : pairLanguages[0];
      const directionLabel = getDirectionFromLanguages(selectionLanguage, targetLang);
      if (!directionLabel) {
        ensureOverlayAutoClose();
        showNotice("Unsupported translation direction.");
        return;
      }
      directionInfo = { targetLang };
    }
  }

  const anchorRect = captureSelectionRect() ?? getCachedSelectionRect();
  const response = await sendMessage<LookupResponse>({
    type: MessageTypes.LookupRequest,
    payload: {
      selectedText: selection,
      ttsAvailable: canPronounce()
    }
  });

  if (!response || !response.ok) {
    ensureOverlayAutoClose();
    showNotice("Select a single word to look up.");
    return;
  }

  const entry = response.entry;
  lookupSessionId += 1;
  const sessionId = lookupSessionId;
  // When translation is disabled, don't show historical translations from previous lookups
  const localDefinition = translationEnabled ? getDefinitionForLanguage(entry, selectionLanguage) : null;
  const suppressFallback = !translationEnabled;
  currentLookupSaveOverride = null;
  currentLookupHighlightOverride = null;
  currentLookupNormalizedWord = entry.normalizedWord;
  currentLookupWasExisting = response.wasExisting;
  currentLookupSavedByLookup = response.savedByLookup;
  currentLookupPreviousEntry = response.previousEntry ?? null;
  const inList = currentLookupWasExisting || currentLookupSavedByLookup;
  const normalizedWord = entry.normalizedWord;
  const defaultHighlight = settings.highlightQueriedWords;
  currentLookupHighlightDefault = defaultHighlight
    ? true
    : inList
      ? !entry.highlightDisabled
      : false;
  if (defaultHighlight && highlightMutedWords.has(normalizedWord)) {
    highlightMutedWords.delete(normalizedWord);
    updateHighlightWords();
    void removeHighlightMutedWord(normalizedWord);
  }
  updateHighlightWords();
  if (defaultHighlight && inList && entry.highlightDisabled) {
    listHighlightWords.add(normalizedWord);
    updateHighlightWords();
    void sendMessage<SetWordHighlightResponse>({
      type: MessageTypes.SetWordHighlight,
      payload: { normalizedWord, highlightDisabled: false }
    });
  }
  if (inList && highlightOnlyWords.has(normalizedWord)) {
    void removeHighlightOnlyWord(normalizedWord);
  }
  if (defaultHighlight && !inList) {
    void addHighlightOnlyWord(normalizedWord);
  }
  ensureOverlayAutoClose();

  // Determine if we have existing cached data
  const hasExistingTranslation = checkExistingTranslation(entry, selectionLanguage, directionInfo?.targetLang);
  const hasExistingDefinition = localDefinition != null;

  showLookupOverlay({
    word: entry.displayWord,
    definition: localDefinition,
    pronunciationAvailable: entry.pronunciationAvailable,
    sourceLang: selectionLanguage,
    suppressFallback,
    saveEnabled: resolveSaveEnabled(settings),
    highlightEnabled: resolveHighlightEnabled(settings),
    anchorRect,
    onPronounce: () => {
      if (!playPronunciation(entry.displayWord)) {
        ensureOverlayAutoClose();
        showNotice("Pronunciation unavailable on this device.");
      }
    },
    // Pass existing translation data if available
    initialTranslation: hasExistingTranslation.translation,
    initialDefinitionTranslation: hasExistingTranslation.definitionTranslation
  });

  latestLookup = {
    sessionId,
    normalizedWord: entry.normalizedWord,
    word: entry.displayWord,
    definitionEn: entry.definitionEn,
    definitionZh: entry.definitionZh,
    definitionJa: entry.definitionJa,
    language: selectionLanguage,
    pronunciationAvailable: entry.pronunciationAvailable
  };

  // Separate API calls for different data types to avoid redundant requests

  // 1. Word Translation API: Get wordZh/wordEn/wordJa
  // Only call if we don't have word translation
  const needsWordTranslation = !hasExistingTranslation.hasWordTranslation;

  // 2. Same-Language Definition API: Get definitionEn/definitionZh/definitionJa
  // Only call if we don't have a definition AND backfill is enabled
  const needsSameLanguageDefinition =
    definitionBackfillEnabled &&
    !hasExistingDefinition &&
    (selectionLanguage === "en" || selectionLanguage === "zh" || selectionLanguage === "ja");

  // 3. Definition Translation API: Translate definition from source to target language
  // Only call if we have a definition AND definition translation is enabled AND we don't have definition translation
  const needsDefinitionTranslation =
    definitionTranslationEnabled &&
    hasExistingDefinition &&  // Need source definition to translate
    !hasExistingTranslation.hasDefinitionTranslation;

  // Execute API calls based on what we need
  if (translationEnabled && directionInfo) {
    // Call word translation API if needed
    if (needsWordTranslation) {
      void requestWordTranslation(
        sessionId,
        entry.displayWord,
        selectionLanguage,
        directionInfo.targetLang
      );
    }

    // Call definition backfill API if needed (same-language definition)
    if (needsSameLanguageDefinition) {
      void requestDefinitionBackfill(sessionId, entry.displayWord, selectionLanguage);
    }

    // Call definition translation API if needed (translate definition to target language)
    if (needsDefinitionTranslation) {
      const sourceDefinition = localDefinition ?? getDefinitionForLanguage(entry, selectionLanguage);
      if (sourceDefinition) {
        void requestDefinitionTranslation(
          sessionId,
          entry.displayWord,
          sourceDefinition,
          selectionLanguage,
          directionInfo.targetLang
        );
      }
    }
  } else if (
    definitionBackfillEnabled &&
    !hasExistingDefinition &&
    (selectionLanguage === "en" || selectionLanguage === "zh" || selectionLanguage === "ja")
  ) {
    // Translation disabled but definition backfill enabled
    void requestDefinitionBackfill(sessionId, entry.displayWord, selectionLanguage);
  }
};

const requestTranslation = async (
  sessionId: number,
  word: string,
  definition: string | null,
  language: WordLanguage,
  targetLang: TranslationTargetLang
) => {
  if (sessionId !== lookupSessionId) {
    return;
  }
  if (!translationEnabled) {
    return;
  }

  bumpAutoCloseIgnore(250);
  const definitionAvailable =
    typeof definition === "string" &&
    definition.trim().length > 0 &&
    definitionTranslationEnabled;
  const preserveDefinitionArea = !definitionAvailable && definitionBackfillEnabled;
  showTranslationLoading(language, { definitionAvailable });

  const response = await sendMessage<TranslationResponse>({
    type: MessageTypes.TranslationRequest,
    payload: {
      word,
      definition: language === "en" && definitionTranslationEnabled ? definition : null,
      sourceLang: language,
      targetLang
    }
  });

  if (sessionId !== lookupSessionId) {
    return;
  }
  if (!translationEnabled) {
    return;
  }

  if (!response) {
    showTranslationError("Translation unavailable. Reload the extension and try again.", language, {
      definitionAvailable,
      preserveDefinitionArea
    });
    return;
  }

  if (response.ok) {
    showTranslationResult(
      {
        translatedWord: response.translatedWord,
        translatedDefinition: response.translatedDefinition ?? null
      },
      language,
      { definitionAvailable, preserveDefinitionArea }
    );
    return;
  }

  if (response.error === "not_configured") {
    showTranslationError("Translation not configured. Set an API key in Options.", language, {
      definitionAvailable,
      preserveDefinitionArea
    });
    return;
  }

  showTranslationError(response.message ?? "Translation unavailable.", language, {
    definitionAvailable,
    preserveDefinitionArea
  });
};

// Request word translation only (no definition translation)
const requestWordTranslation = async (
  sessionId: number,
  word: string,
  language: WordLanguage,
  targetLang: TranslationTargetLang
) => {
  if (sessionId !== lookupSessionId) {
    return;
  }
  if (!translationEnabled) {
    return;
  }

  bumpAutoCloseIgnore(250);

  // Show loading for word translation only
  showTranslationLoading(language, { definitionAvailable: false });

  const response = await sendMessage<TranslationResponse>({
    type: MessageTypes.TranslationRequest,
    payload: {
      word,
      definition: null,  // Don't request definition translation
      sourceLang: language,
      targetLang
    }
  });

  if (sessionId !== lookupSessionId) {
    return;
  }
  if (!translationEnabled) {
    return;
  }

  if (!response) {
    showTranslationError("Translation unavailable. Reload the extension and try again.", language, {
      definitionAvailable: false,
      preserveDefinitionArea: true
    });
    return;
  }

  if (response.ok) {
    showTranslationResult(
      {
        translatedWord: response.translatedWord,
        translatedDefinition: null  // No definition translation
      },
      language,
      { definitionAvailable: false, preserveDefinitionArea: true }
    );
    return;
  }

  if (response.error === "not_configured") {
    showTranslationError("Translation not configured. Set an API key in Options.", language, {
      definitionAvailable: false,
      preserveDefinitionArea: true
    });
    return;
  }

  showTranslationError(response.message ?? "Translation unavailable.", language, {
    definitionAvailable: false,
    preserveDefinitionArea: true
  });
};

// Request definition translation only (requires source definition)
const requestDefinitionTranslation = async (
  sessionId: number,
  word: string,
  sourceDefinition: string,
  language: WordLanguage,
  targetLang: TranslationTargetLang
) => {
  if (sessionId !== lookupSessionId) {
    return;
  }
  if (!translationEnabled || !definitionTranslationEnabled) {
    return;
  }

  bumpAutoCloseIgnore(250);

  // Show loading for definition translation
  showTranslationLoading(language, {
    definitionAvailable: true,
    preserveDefinitionArea: false
  });

  const response = await sendMessage<TranslationResponse>({
    type: MessageTypes.TranslationRequest,
    payload: {
      word,
      definition: sourceDefinition,  // Request definition translation
      sourceLang: language,
      targetLang
    }
  });

  if (sessionId !== lookupSessionId) {
    return;
  }
  if (!translationEnabled) {
    return;
  }

  if (!response) {
    showTranslationError("Translation unavailable. Reload the extension and try again.", language, {
      definitionAvailable: true,
      preserveDefinitionArea: false
    });
    return;
  }

  if (response.ok) {
    showTranslationResult(
      {
        translatedWord: response.translatedWord,  // May be null, that's ok
        translatedDefinition: response.translatedDefinition ?? null
      },
      language,
      { definitionAvailable: true, preserveDefinitionArea: false }
    );
    return;
  }

  if (response.error === "not_configured") {
    showTranslationError("Translation not configured. Set an API key in Options.", language, {
      definitionAvailable: true,
      preserveDefinitionArea: false
    });
    return;
  }

  showTranslationError(response.message ?? "Translation unavailable.", language, {
    definitionAvailable: true,
    preserveDefinitionArea: false
  });
};

const requestDefinitionBackfill = async (sessionId: number, word: string, sourceLang: WordLanguage) => {
  if (sessionId !== lookupSessionId) {
    return;
  }
  if (!translationEnabled || !definitionBackfillEnabled) {
    return;
  }

  bumpAutoCloseIgnore(250);
  showGeneratedDefinitionLoading(sourceLang);

  const response = await sendMessage<DefinitionBackfillResponse>({
    type: MessageTypes.DefinitionBackfillRequest,
    payload: { word }
  });

  if (sessionId !== lookupSessionId) {
    return;
  }
  if (!translationEnabled || !definitionBackfillEnabled) {
    return;
  }

  if (!response) {
    showGeneratedDefinitionError("Definition unavailable. Reload the extension and try again.", sourceLang);
    return;
  }

  if (response.ok) {
    showGeneratedDefinitionResult(response, { showDefinitionTranslation: definitionTranslationEnabled });
    return;
  }

  if (response.error === "not_configured") {
    showGeneratedDefinitionError("Definition not configured. Set an API key in Options.", sourceLang);
    return;
  }

  showGeneratedDefinitionError(getDefinitionBackfillErrorMessage(response.error), sourceLang);
};

const syncTranslationEnabledState = async () => {
  const settings = await readTranslationSettings();
  translationEnabled = Boolean(settings.enabled);
  definitionBackfillEnabled = Boolean(settings.definitionBackfillEnabled);
  definitionTranslationEnabled = Boolean(settings.definitionTranslationEnabled);
  const lookup = latestLookup;
  if (!translationEnabled && lookup && lookup.sessionId === lookupSessionId && isOverlayOpen()) {
    const localDefinition = getDefinitionForLanguage(lookup, lookup.language);
    resetTranslationUi(localDefinition, lookup.language, { suppressFallback: !translationEnabled });
  }
};

const fetchWords = async (): Promise<{ words: WordEntry[]; highlightOnlyWords: string[]; highlightMutedWords: string[] }> => {
  const response = await sendMessage<WordsResponse>({ type: MessageTypes.ListWords });
  if (!response || !response.ok) {
    return { words: [], highlightOnlyWords: [], highlightMutedWords: [] };
  }
  return {
    words: response.words,
    highlightOnlyWords: Array.isArray(response.highlightOnlyWords) ? response.highlightOnlyWords : [],
    highlightMutedWords: Array.isArray(response.highlightMutedWords) ? response.highlightMutedWords : []
  };
};

const fetchPreferences = async (): Promise<Preferences> => {
  const response = await sendMessage<PreferencesResponse>({
    type: MessageTypes.GetHighlightPreference
  });
  if (!response || !response.ok) {
    return { highlightEnabled: true };
  }
  return response.preferences;
};

const updateHighlightWords = () => {
  if (!highlightEnabled) {
    highlightEngine.setWords([]);
    highlightEngine.setEnabled(false);
    return;
  }

  const next = new Set([...listHighlightWords, ...highlightOnlyWords]);
  highlightMutedWords.forEach((word) => next.delete(word));
  if (currentLookupNormalizedWord && currentLookupHighlightDefault !== null) {
    const effective =
      currentLookupHighlightOverride !== null ? currentLookupHighlightOverride : currentLookupHighlightDefault;
    if (effective) {
      next.add(currentLookupNormalizedWord);
    } else {
      // Only remove the word if it's not already permanently highlighted
      // This preserves the highlight state of words that should be highlighted
      const isInListHighlightWords = listHighlightWords.has(currentLookupNormalizedWord);
      const isInHighlightOnlyWords = highlightOnlyWords.has(currentLookupNormalizedWord);
      if (!isInListHighlightWords && !isInHighlightOnlyWords) {
        next.delete(currentLookupNormalizedWord);
      }
      // If word is already in listHighlightWords or highlightOnlyWords, keep it highlighted
    }
  }
  highlightEngine.setWords(Array.from(next));
  highlightEngine.setEnabled(true);
};

const resolveSaveEnabled = (settings: { saveQueriedWords: boolean }) => {
  if (currentLookupSaveOverride !== null) {
    return currentLookupSaveOverride;
  }
  return settings.saveQueriedWords;
};

const resolveHighlightEnabled = (settings: { highlightQueriedWords: boolean }) => {
  if (currentLookupHighlightOverride !== null) {
    return currentLookupHighlightOverride;
  }
  // If global highlight is enabled, button should always be active
  if (settings.highlightQueriedWords) {
    return true;
  }
  // If global highlight is disabled, check if word is currently highlighted on page
  if (currentLookupNormalizedWord) {
    const isInListHighlightWords = listHighlightWords.has(currentLookupNormalizedWord);
    const isInHighlightOnlyWords = highlightOnlyWords.has(currentLookupNormalizedWord);
    const isInMutedWords = highlightMutedWords.has(currentLookupNormalizedWord);
    return (isInListHighlightWords || isInHighlightOnlyWords) && !isInMutedWords;
  }
  return false;
};

const applyHighlightState = (
  words: WordEntry[],
  highlightOnly: string[],
  highlightMuted: string[],
  preferences: Preferences
) => {
  highlightEnabled = preferences.highlightEnabled;
  listHighlightWords = new Set(
    words.filter((entry) => !entry.highlightDisabled).map((entry) => entry.normalizedWord)
  );
  highlightOnlyWords = new Set(highlightOnly);
  highlightMutedWords = new Set(highlightMuted);
  updateHighlightWords();
};

const syncHighlightState = async () => {
  const [wordState, preferences] = await Promise.all([fetchWords(), fetchPreferences()]);
  applyHighlightState(wordState.words, wordState.highlightOnlyWords, wordState.highlightMutedWords, preferences);
};

const setHighlightOnlyWords = (next: string[]) => {
  highlightOnlyWords = new Set(next);
  updateHighlightWords();
};

const setHighlightMutedWords = (next: string[]) => {
  highlightMutedWords = new Set(next);
  updateHighlightWords();
};

const addHighlightOnlyWord = async (normalizedWord: string) => {
  if (highlightOnlyWords.has(normalizedWord)) {
    return;
  }
  const response = await sendMessage<HighlightOnlyResponse>({
    type: MessageTypes.AddHighlightOnlyWord,
    payload: { normalizedWord }
  });
  if (response && response.ok) {
    setHighlightOnlyWords(response.highlightOnlyWords);
  }
};

const removeHighlightOnlyWord = async (normalizedWord: string) => {
  if (!highlightOnlyWords.has(normalizedWord)) {
    return;
  }
  const response = await sendMessage<HighlightOnlyResponse>({
    type: MessageTypes.RemoveHighlightOnlyWord,
    payload: { normalizedWord }
  });
  if (response && response.ok) {
    setHighlightOnlyWords(response.highlightOnlyWords);
  }
};

const addHighlightMutedWord = async (normalizedWord: string) => {
  if (highlightMutedWords.has(normalizedWord)) {
    return;
  }
  const response = await sendMessage<HighlightMutedResponse>({
    type: MessageTypes.AddHighlightMutedWord,
    payload: { normalizedWord }
  });
  if (response && response.ok) {
    setHighlightMutedWords(response.highlightMutedWords);
  }
};

const removeHighlightMutedWord = async (normalizedWord: string) => {
  if (!highlightMutedWords.has(normalizedWord)) {
    return;
  }
  const response = await sendMessage<HighlightMutedResponse>({
    type: MessageTypes.RemoveHighlightMutedWord,
    payload: { normalizedWord }
  });
  if (response && response.ok) {
    setHighlightMutedWords(response.highlightMutedWords);
  }
};

let suppressSaveToggleHandler = false;
let suppressHighlightToggleHandler = false;

const handleSaveToggle = async (enabled: boolean) => {
  if (suppressSaveToggleHandler) {
    return;
  }

  const lookup = latestLookup;
  if (!lookup) {
    return;
  }

  const normalizedWord = lookup.normalizedWord || normalizeWord(lookup.word);
  if (!normalizedWord) {
    return;
  }

  currentLookupSaveOverride = enabled;
  const shouldHighlight =
    currentLookupHighlightOverride !== null
      ? currentLookupHighlightOverride
      : currentLookupHighlightDefault ?? currentLookupHighlightSetting;
  const inList = currentLookupWasExisting || currentLookupSavedByLookup;

  if (enabled) {
    if (inList) {
      // Word already exists, but user clicked save button, so increment query count
      await sendMessage<AddWordResponse>({
        type: MessageTypes.AddWord,
        payload: { word: lookup.word, ttsAvailable: lookup.pronunciationAvailable }
      });
      return;
    }
    const response = await sendMessage<AddWordResponse>({
      type: MessageTypes.AddWord,
      payload: { word: lookup.word, ttsAvailable: lookup.pronunciationAvailable }
    });
    if (!response || !response.ok) {
      suppressSaveToggleHandler = true;
      setWordSaveEnabled(false);
      suppressSaveToggleHandler = false;
      currentLookupSaveOverride = false;
      return;
    }
    currentLookupSavedByLookup = true;
    if (shouldHighlight) {
      listHighlightWords.add(response.entry.normalizedWord);
    } else {
      listHighlightWords.delete(response.entry.normalizedWord);
      void sendMessage<SetWordHighlightResponse>({
        type: MessageTypes.SetWordHighlight,
        payload: { normalizedWord: response.entry.normalizedWord, highlightDisabled: true }
      });
    }
    updateHighlightWords();
    void removeHighlightOnlyWord(response.entry.normalizedWord);
    void removeHighlightMutedWord(response.entry.normalizedWord);
    return;
  }

  if (currentLookupSavedByLookup && !currentLookupWasExisting) {
    const response = await sendMessage<DeleteWordResponse>({
      type: MessageTypes.DeleteWord,
      payload: { normalizedWord }
    });

    if (!response || !response.ok) {
      suppressSaveToggleHandler = true;
      setWordSaveEnabled(true);
      suppressSaveToggleHandler = false;
      currentLookupSaveOverride = true;
      return;
    }

    currentLookupSavedByLookup = false;
    listHighlightWords.delete(normalizedWord);
    updateHighlightWords();
    if (shouldHighlight) {
      void addHighlightOnlyWord(normalizedWord);
      void removeHighlightMutedWord(normalizedWord);
    } else {
      void removeHighlightOnlyWord(normalizedWord);
      void addHighlightMutedWord(normalizedWord);
    }
    return;
  }

  if (currentLookupSavedByLookup && currentLookupWasExisting) {
    const restoreEntry = currentLookupPreviousEntry
      ? {
          ...currentLookupPreviousEntry,
          highlightDisabled: !shouldHighlight
        }
      : currentLookupPreviousEntry;
    const response = await sendMessage<RestoreWordResponse>({
      type: MessageTypes.RestoreWord,
      payload: { normalizedWord, previousEntry: restoreEntry }
    });

    if (!response || !response.ok) {
      suppressSaveToggleHandler = true;
      setWordSaveEnabled(true);
      suppressSaveToggleHandler = false;
      currentLookupSaveOverride = true;
      return;
    }

    currentLookupSavedByLookup = false;
    if (restoreEntry && !restoreEntry.highlightDisabled) {
      listHighlightWords.add(normalizedWord);
    } else {
      listHighlightWords.delete(normalizedWord);
    }
    updateHighlightWords();
    void removeHighlightOnlyWord(normalizedWord);
    void removeHighlightMutedWord(normalizedWord);
  }
};

const handleHighlightToggle = async (enabled: boolean) => {
  if (suppressHighlightToggleHandler) {
    return;
  }

  const lookup = latestLookup;
  if (!lookup) {
    return;
  }

  const normalizedWord = lookup.normalizedWord || normalizeWord(lookup.word);
  if (!normalizedWord) {
    return;
  }

  currentLookupHighlightOverride = enabled;
  currentLookupNormalizedWord = normalizedWord;
  updateHighlightWords();

  const inList = currentLookupWasExisting || currentLookupSavedByLookup;
  if (!inList) {
    if (enabled) {
      void removeHighlightMutedWord(normalizedWord);
      void addHighlightOnlyWord(normalizedWord);
    } else {
      void removeHighlightOnlyWord(normalizedWord);
      void addHighlightMutedWord(normalizedWord);
    }
    return;
  }

  const response = await sendMessage<SetWordHighlightResponse>({
    type: MessageTypes.SetWordHighlight,
    payload: { normalizedWord, highlightDisabled: !enabled }
  });

  if (!response || !response.ok) {
    suppressHighlightToggleHandler = true;
    setWordHighlightEnabled(!enabled);
    suppressHighlightToggleHandler = false;
    currentLookupHighlightOverride = !enabled;
    updateHighlightWords();
    return;
  }

  if (enabled) {
    listHighlightWords.add(normalizedWord);
  } else {
    listHighlightWords.delete(normalizedWord);
  }
  updateHighlightWords();
};

let autoCloseActive = false;

const ensureOverlayAutoClose = () => {
  if (autoCloseActive) {
    return;
  }
  autoCloseActive = true;
  document.addEventListener("selectionchange", handleSelectionChange);
  document.addEventListener("pointerdown", handlePointerDown, true);
  document.addEventListener("keydown", handleKeydown);
  window.addEventListener("scroll", handleScroll, true);
  window.addEventListener("resize", handleResize);
};

const removeOverlayAutoClose = () => {
  if (!autoCloseActive) {
    return;
  }
  autoCloseActive = false;
  document.removeEventListener("selectionchange", handleSelectionChange);
  document.removeEventListener("pointerdown", handlePointerDown, true);
  document.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("scroll", handleScroll, true);
  window.removeEventListener("resize", handleResize);
};

const closeOverlay = () => {
  if (!isOverlayOpen()) {
    return;
  }
  hideLookupOverlay();
};

const handleSelectionChange = () => {
  if (!isOverlayOpen() || shouldIgnoreAutoClose()) {
    return;
  }
  const selection = window.getSelection();
  const selectionText = selection?.toString().trim() ?? "";
  if (!selection || selection.isCollapsed || !selectionText) {
    closeOverlay();
    return;
  }
  captureSelectionRect();
};

const handlePointerDown = (event: PointerEvent) => {
  if (!isOverlayOpen()) {
    return;
  }
  if (overlayContainsTarget(event.target)) {
    bumpAutoCloseIgnore(200);
    return;
  }
  closeOverlay();
};

const handleKeydown = (event: KeyboardEvent) => {
  if (!isOverlayOpen()) {
    return;
  }
  if (event.key === "Escape") {
    closeOverlay();
  }
};

const handleScroll = () => {
  closeOverlay();
};

const handleResize = () => {
  closeOverlay();
};

const removeLegacyHighlightToggle = () => {
  const existing = document.getElementById("wordmark-highlight-toggle");
  if (existing) {
    existing.remove();
  }
};

const initializeContent = () => {
  setOverlayHideListener(() => {
    latestLookup = null;
    currentLookupSaveOverride = null;
    currentLookupWasExisting = false;
    currentLookupSavedByLookup = false;
    currentLookupPreviousEntry = null;
    currentLookupHighlightOverride = null;
    currentLookupHighlightDefault = null;
    currentLookupNormalizedWord = null;
    updateHighlightWords();
    removeOverlayAutoClose();
  });
  setWordSaveToggleHandler(handleSaveToggle);
  setWordHighlightToggleHandler(handleHighlightToggle);
  removeLegacyHighlightToggle();
  installSelectionRectTracking();
  void syncHighlightState();
  if (chrome?.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") {
        return;
      }
      if (changes[STORAGE_KEY]) {
        void syncHighlightState();
      }
      if (changes[TRANSLATION_SETTINGS_KEY]) {
        void syncTranslationEnabledState();
      }
    });
  }
  if (chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      const type = typeof message === "object" && message ? (message as { type?: unknown }).type : undefined;
      if (type === MessageTypes.LookupTrigger) {
        void triggerLookup();
      }
    });
  }
};

initializeContent();
