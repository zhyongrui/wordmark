import { MessageTypes } from "../shared/messages";
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
  showLookupOverlay,
  showNotice
} from "./lookup-overlay";
import { canPronounce, playPronunciation } from "./pronounce";
import { createHighlightEngine } from "./highlight";
import type { Preferences, WordEntry } from "../shared/storage/schema";

type LookupResponse =
  | { ok: true; entry: { displayWord: string; definition: string | null; pronunciationAvailable: boolean } }
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
  const selection = window.getSelection()?.toString() ?? "";
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
  ensureOverlayAutoClose();
  showLookupOverlay({
    word: entry.displayWord,
    definition: entry.definition,
    pronunciationAvailable: entry.pronunciationAvailable,
    anchorRect,
    onPronounce: () => {
      if (!playPronunciation(entry.displayWord)) {
        ensureOverlayAutoClose();
        showNotice("Pronunciation unavailable on this device.");
      }
    }
  });
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
  setOverlayHideListener(removeOverlayAutoClose);
  removeLegacyHighlightToggle();
  installSelectionRectTracking();
  void syncHighlightState();
  if (chrome?.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[STORAGE_KEY]) {
        return;
      }
      void syncHighlightState();
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
