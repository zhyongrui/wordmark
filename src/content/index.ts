import { MessageTypes, type DefinitionBackfillResponse, type DefinitionSource } from "../shared/messages";
import {
  bumpAutoCloseIgnore,
  captureSelectionRect,
  getCachedSelectionRect,
  hideLookupOverlay,
  installSelectionRectTracking,
  isOverlayOpen,
  overlayContainsTarget,
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
import { detectWordLanguage, type WordLanguage } from "../shared/word/normalize";

type LookupResponse =
  | {
      ok: true;
      entry: {
        displayWord: string;
        definitionEn?: string;
        definitionZh?: string;
        definitionJa?: string;
        definitionSource: DefinitionSource;
        pronunciationAvailable: boolean;
      };
    }
  | { ok: false; error: string };

type WordsResponse =
  | { ok: true; words: WordEntry[] }
  | { ok: false; error: string };

type PreferencesResponse =
  | { ok: true; preferences: Preferences }
  | { ok: false; error: string };

const STORAGE_KEY = "wordmark:storage";
const highlightEngine = createHighlightEngine();
let highlightEnabled = true;
let lookupSessionId = 0;
let translationEnabled = false;
let definitionBackfillEnabled = false;
let definitionTranslationEnabled = false;
let latestLookup:
  | {
      sessionId: number;
      word: string;
      definitionEn?: string;
      definitionZh?: string;
      definitionJa?: string;
      language: WordLanguage;
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
  const localDefinition = getDefinitionForLanguage(entry, selectionLanguage);
  ensureOverlayAutoClose();
  showLookupOverlay({
    word: entry.displayWord,
    definition: localDefinition,
    pronunciationAvailable: entry.pronunciationAvailable,
    sourceLang: selectionLanguage,
    anchorRect,
    onPronounce: () => {
      if (!playPronunciation(entry.displayWord)) {
        ensureOverlayAutoClose();
        showNotice("Pronunciation unavailable on this device.");
      }
    }
  });

  latestLookup = {
    sessionId,
    word: entry.displayWord,
    definitionEn: entry.definitionEn,
    definitionZh: entry.definitionZh,
    definitionJa: entry.definitionJa,
    language: selectionLanguage
  };
  if (translationEnabled && directionInfo) {
    const translationPromise = requestTranslation(
      sessionId,
      entry.displayWord,
      localDefinition,
      selectionLanguage,
      directionInfo.targetLang
    );
    void translationPromise.then(() => {
      if (
        definitionBackfillEnabled &&
        localDefinition == null &&
        (selectionLanguage === "en" || selectionLanguage === "zh" || selectionLanguage === "ja")
      ) {
        void requestDefinitionBackfill(sessionId, entry.displayWord, selectionLanguage);
      }
    });
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
    resetTranslationUi(localDefinition, lookup.language);
  }
};

const fetchWords = async (): Promise<WordEntry[]> => {
  const response = await sendMessage<WordsResponse>({ type: MessageTypes.ListWords });
  if (!response || !response.ok) {
    return [];
  }
  return response.words;
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

const applyHighlightState = (words: WordEntry[], preferences: Preferences) => {
  highlightEnabled = preferences.highlightEnabled;
  const normalizedWords = words.map((entry) => entry.normalizedWord);
  highlightEngine.setWords(normalizedWords);
  highlightEngine.setEnabled(highlightEnabled);
};

const syncHighlightState = async () => {
  const [words, preferences] = await Promise.all([fetchWords(), fetchPreferences()]);
  applyHighlightState(words, preferences);
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
    removeOverlayAutoClose();
  });
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
