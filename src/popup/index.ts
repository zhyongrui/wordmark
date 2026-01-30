import { MessageTypes } from "../shared/messages";
import type { Preferences, WordEntry } from "../shared/storage/schema";
import {
  getDirectionDetails,
  getDualPairDirections,
  getLanguageCode,
  getOppositeDirection
} from "../shared/translation/directions";
import { readTranslationSettings, TRANSLATION_SETTINGS_KEY } from "../shared/translation/settings";
import type { TranslationDirection } from "../shared/translation/settings";
import { filterWordEntries, sortWordEntries } from "../shared/word/list";
import { detectWordLanguage, type WordLanguage } from "../shared/word/normalize";

type WordsResponse =
  | { ok: true; words: WordEntry[] }
  | { ok: false; error: string };

type DeleteResponse =
  | { ok: true }
  | { ok: false; error: string };

type PreferencesResponse =
  | { ok: true; preferences: Preferences }
  | { ok: false; error: string };

const STORAGE_KEY = "wordmark:storage";

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

const app = document.getElementById("app");
const searchInput = document.getElementById("search-input") as HTMLInputElement | null;
const listEl = document.getElementById("word-list") as HTMLDivElement | null;
const emptyEl = document.getElementById("empty-state") as HTMLDivElement | null;
const countEl = document.getElementById("word-count") as HTMLDivElement | null;
const settingsButton = document.getElementById("settings-button") as HTMLButtonElement | null;
const toggleButton = document.getElementById("highlight-toggle") as HTMLButtonElement | null;
const directionToggle = document.getElementById("direction-toggle") as HTMLDivElement | null;
const languageFilter = document.getElementById("language-filter") as HTMLDivElement | null;
const languageToggle = document.getElementById("language-toggle") as HTMLButtonElement | null;
const languageList = document.getElementById("language-list") as HTMLDivElement | null;
const languageLabel = languageToggle?.querySelector(".wordmark-language-label") as HTMLSpanElement | null;
const directionButtons = directionToggle
  ? Array.from(directionToggle.querySelectorAll<HTMLButtonElement>(".wordmark-direction-button"))
  : [];
const languageOptions = languageList
  ? Array.from(languageList.querySelectorAll<HTMLButtonElement>(".wordmark-language-option"))
  : [];

if (
  !app ||
  !searchInput ||
  !listEl ||
  !emptyEl ||
  !countEl ||
  !toggleButton ||
  !settingsButton ||
  !directionToggle ||
  !languageFilter ||
  !languageToggle ||
  !languageList ||
  !languageLabel
) {
  throw new Error("Popup root elements missing.");
}

let words: WordEntry[] = [];
let highlightEnabled = true;
let translationEnabled = false;
let translationMode: "single" | "dual" = "single";
let singleDirection: TranslationDirection = "EN->ZH";
let listDirection: TranslationDirection = "EN->ZH";
let lastDirectionFromSettings: TranslationDirection = "EN->ZH";
let dualDirections: [TranslationDirection, TranslationDirection] = ["EN->ZH", "ZH->EN"];
let listLanguageFilter: "all" | "en" | "zh" | "ja" = "all";

const formatCount = (count: number) => `${count} ${count === 1 ? "time" : "times"}`;

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
};

const setEmptyState = (message: string, visible: boolean) => {
  emptyEl.textContent = message;
  emptyEl.hidden = !visible;
};

const setToggleState = (enabled: boolean) => {
  highlightEnabled = enabled;
  toggleButton.setAttribute("data-enabled", String(enabled));
  toggleButton.setAttribute("aria-pressed", String(enabled));
};

const updateCountVisibility = () => {
  const hasQuery = searchInput.value.trim().length > 0;
  const isFocused = document.activeElement === searchInput;
  countEl.hidden = isFocused || hasQuery;
};

const getEntryLanguage = (entry: WordEntry): WordLanguage | null => {
  return detectWordLanguage(entry.normalizedWord) ?? detectWordLanguage(entry.displayWord);
};

const getLabelForEntry = (entry: WordEntry, sourceLanguage: WordLanguage | null): string => {
  if (!translationEnabled) {
    return "";
  }
  if (!sourceLanguage) {
    return (
      typeof entry.wordZh === "string" && entry.wordZh.trim()
        ? entry.wordZh.trim()
        : typeof entry.wordEn === "string" && entry.wordEn.trim()
          ? entry.wordEn.trim()
          : typeof entry.wordJa === "string" && entry.wordJa.trim()
            ? entry.wordJa.trim()
            : ""
    );
  }

  // Get the current translation direction to determine target language
  const activeDirection = getActiveDirection();
  const { target: targetLanguage } = getDirectionDetails(activeDirection);

  // Return the translation in the target language
  if (targetLanguage === "zh") {
    return typeof entry.wordZh === "string" && entry.wordZh.trim() ? entry.wordZh.trim() : "";
  }
  if (targetLanguage === "en") {
    return typeof entry.wordEn === "string" && entry.wordEn.trim() ? entry.wordEn.trim() : "";
  }
  if (targetLanguage === "ja") {
    return typeof entry.wordJa === "string" && entry.wordJa.trim() ? entry.wordJa.trim() : "";
  }

  return "";
};

const getActiveDirection = (): TranslationDirection => {
  return listDirection;
};

const filterByDirection = (entries: WordEntry[]) => {
  if (!translationEnabled) {
    if (listLanguageFilter === "all") {
      return entries;
    }
    return entries.filter((entry) => getEntryLanguage(entry) === listLanguageFilter);
  }
  const activeDirection = getActiveDirection();
  const { source: sourceLanguage, target: targetLanguage } = getDirectionDetails(activeDirection);

  return entries.filter((entry) => {
    const language = getEntryLanguage(entry);
    if (!language) {
      return true;
    }

    // Check if source language matches
    if (language !== sourceLanguage) {
      return false;
    }

    // Check if the target language translation exists
    if (targetLanguage === "zh") {
      return typeof entry.wordZh === "string" && entry.wordZh.trim().length > 0;
    }
    if (targetLanguage === "en") {
      return typeof entry.wordEn === "string" && entry.wordEn.trim().length > 0;
    }
    if (targetLanguage === "ja") {
      return typeof entry.wordJa === "string" && entry.wordJa.trim().length > 0;
    }

  return false;
  });
};

const setLanguageListOpen = (open: boolean) => {
  languageList.hidden = !open;
  languageToggle.setAttribute("aria-expanded", String(open));
};

const updateListControls = () => {
  if (!translationEnabled) {
    directionToggle.hidden = true;
    languageFilter.hidden = false;
    languageLabel.textContent = listLanguageFilter.toUpperCase();
    languageOptions.forEach((option) => {
      const language = option.dataset.language;
      option.setAttribute("aria-selected", String(language === listLanguageFilter));
    });
    setLanguageListOpen(false);
    return;
  }

  directionToggle.hidden = false;
  languageFilter.hidden = true;
  setLanguageListOpen(false);
  directionToggle.dataset.mode = translationMode;

  if (translationMode === "single") {
    // In single mode, arrow direction is fixed but users can toggle which word list to view
    directionToggle.dataset.direction = singleDirection;
    const details = getDirectionDetails(singleDirection);
    const oppositeDirection = getOppositeDirection(singleDirection);

    directionButtons.forEach((button, index) => {
      if (index === 0) {
        // First button: source language
        button.dataset.direction = singleDirection;
        button.textContent = getLanguageCode(details.source);
        button.disabled = false;
        button.setAttribute("aria-pressed", String(listDirection === singleDirection));
      } else {
        // Second button: target language
        button.dataset.direction = oppositeDirection;
        button.textContent = getLanguageCode(details.target);
        button.disabled = false;
        button.setAttribute("aria-pressed", String(listDirection === oppositeDirection));
      }
    });
  } else {
    // In dual mode, show both directions and enable interaction
    directionToggle.dataset.direction = listDirection;
    directionButtons.forEach((button, index) => {
      const direction = dualDirections[index];
      const sourceLanguage = getDirectionDetails(direction).source;
      button.dataset.direction = direction;
      button.textContent = getLanguageCode(sourceLanguage);
      button.disabled = false;
      button.setAttribute("aria-pressed", String(direction === listDirection));
    });
  }
};

const renderList = () => {
  const query = searchInput.value;
  const directionFiltered = filterByDirection(words);
  const filtered = filterWordEntries(directionFiltered, query);
  const sorted = sortWordEntries(filtered);

  listEl.textContent = "";
  countEl.textContent = `${directionFiltered.length} WORDS`;
  updateCountVisibility();

  if (sorted.length === 0) {
    const message = query.trim() ? "No matches found." : "No words yet.";
    setEmptyState(message, true);
    return;
  }

  setEmptyState("", false);

  sorted.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "wordmark-item";

    const info = document.createElement("div");
    const word = document.createElement("div");
    word.className = "wordmark-word";
    word.textContent = entry.displayWord;
    const entryLanguage = getEntryLanguage(entry);
    const label = getLabelForEntry(entry, entryLanguage);
    if (label) {
      const zh = document.createElement("span");
      zh.className = "wordmark-word-zh";
      zh.textContent = ` ${label}`;
      word.appendChild(zh);
    }

    const meta = document.createElement("div");
    meta.className = "wordmark-meta";
    meta.textContent = `${formatCount(entry.queryCount)} · ${formatDate(entry.lastQueriedAt)}`;

    info.appendChild(word);
    info.appendChild(meta);

    const remove = document.createElement("button");
    remove.className = "wordmark-delete";
    remove.type = "button";
    remove.textContent = "Delete";
    remove.addEventListener("click", async () => {
      remove.disabled = true;
      const response = await sendMessage<DeleteResponse>({
        type: MessageTypes.DeleteWord,
        payload: { normalizedWord: entry.normalizedWord }
      });

      if (!response || !response.ok) {
        remove.disabled = false;
        return;
      }

      await refreshWords();
    });

    row.appendChild(info);
    row.appendChild(remove);
    listEl.appendChild(row);
  });
};

const refreshWords = async () => {
  const response = await sendMessage<WordsResponse>({ type: MessageTypes.ListWords });
  if (!response || !response.ok) {
    words = [];
    renderList();
    return;
  }

  words = response.words;
  renderList();
};

const refreshTranslationSettings = async () => {
  const settings = await readTranslationSettings();
  const modeChanged = settings.mode !== translationMode;
  translationEnabled = settings.enabled;
  translationMode = settings.mode;
  singleDirection = settings.singleDirection;
  const nextDualDirections = getDualPairDirections(settings.dualPair);
  const pairChanged =
    nextDualDirections[0] !== dualDirections[0] || nextDualDirections[1] !== dualDirections[1];
  dualDirections = nextDualDirections;

  if (!translationEnabled) {
    listLanguageFilter = "all";
  }

  if (translationMode === "single") {
    listDirection = singleDirection;
  } else {
    const hasValidLastDirection = dualDirections.includes(settings.lastDirection);
    if (modeChanged || pairChanged || !hasValidLastDirection || settings.lastDirection !== lastDirectionFromSettings) {
      listDirection = hasValidLastDirection ? settings.lastDirection : dualDirections[0];
    }
  }

  lastDirectionFromSettings = settings.lastDirection;
  updateListControls();
  renderList();
};

const refreshPreferences = async () => {
  const response = await sendMessage<PreferencesResponse>({
    type: MessageTypes.GetHighlightPreference
  });
  if (!response || !response.ok) {
    setToggleState(true);
    return;
  }

  setToggleState(response.preferences.highlightEnabled);
};

searchInput.addEventListener("input", () => {
  renderList();
});

searchInput.addEventListener("focus", () => {
  updateCountVisibility();
});

searchInput.addEventListener("blur", () => {
  updateCountVisibility();
});

toggleButton.addEventListener("click", async () => {
  const nextEnabled = !highlightEnabled;
  setToggleState(nextEnabled);
  toggleButton.disabled = true;

  const response = await sendMessage<PreferencesResponse>({
    type: MessageTypes.SetHighlightPreference,
    payload: { highlightEnabled: nextEnabled }
  });

  if (!response || !response.ok) {
    setToggleState(!nextEnabled);
    toggleButton.disabled = false;
    return;
  }

  setToggleState(response.preferences.highlightEnabled);
  toggleButton.disabled = false;
});

if (chrome?.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }
    if (changes[STORAGE_KEY]) {
      void refreshWords();
      void refreshPreferences();
    }
    if (changes[TRANSLATION_SETTINGS_KEY]) {
      void refreshTranslationSettings();
    }
  });
}

const openOptionsPage = async () => {
  try {
    if (chrome?.runtime?.openOptionsPage) {
      await chrome.runtime.openOptionsPage();
      return;
    }
  } catch {
    // Fallback below
  }

  if (chrome?.tabs?.create && chrome?.runtime?.getURL) {
    try {
      await chrome.tabs.create({ url: chrome.runtime.getURL("options/options.html") });
    } catch {
      // Swallow errors to avoid breaking popup UX
    }
  }
};

settingsButton.addEventListener("click", () => {
  void openOptionsPage();
});

directionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const direction = button.dataset.direction as TranslationDirection | undefined;
    if (!direction) {
      return;
    }
    listDirection = direction;
    updateListControls();
    renderList();
  });
});

languageToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  if (translationEnabled) {
    return;
  }
  setLanguageListOpen(languageList.hidden);
});

languageOptions.forEach((option) => {
  option.addEventListener("click", (event) => {
    event.stopPropagation();
    const language = option.dataset.language as "all" | "en" | "zh" | "ja" | undefined;
    if (!language) {
      return;
    }
    listLanguageFilter = language;
    updateListControls();
    renderList();
    languageToggle.focus();
  });
});

document.addEventListener("click", (event) => {
  if (translationEnabled || languageList.hidden) {
    return;
  }
  if (languageFilter.contains(event.target as Node)) {
    return;
  }
  setLanguageListOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }
  if (!languageList.hidden) {
    setLanguageListOpen(false);
    languageToggle.focus();
  }
});

void refreshWords();
void refreshTranslationSettings();
void refreshPreferences();

export {};
