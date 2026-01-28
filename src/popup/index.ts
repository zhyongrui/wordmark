import { MessageTypes } from "../shared/messages";
import type { Preferences, WordEntry } from "../shared/storage/schema";
import { readTranslationSettings, TRANSLATION_SETTINGS_KEY } from "../shared/translation/settings";
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
const directionButtons = directionToggle
  ? Array.from(directionToggle.querySelectorAll<HTMLButtonElement>(".wordmark-direction-button"))
  : [];

if (
  !app ||
  !searchInput ||
  !listEl ||
  !emptyEl ||
  !countEl ||
  !toggleButton ||
  !settingsButton ||
  !directionToggle
) {
  throw new Error("Popup root elements missing.");
}

let words: WordEntry[] = [];
let highlightEnabled = true;
let translationMode: "single" | "dual" = "single";
let singleDirection: "EN->ZH" | "ZH->EN" = "EN->ZH";
let listDirection: "EN->ZH" | "ZH->EN" = "EN->ZH";
let lastDirectionFromSettings: "EN->ZH" | "ZH->EN" = "EN->ZH";

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

const getActiveDirection = (): "EN->ZH" | "ZH->EN" => {
  return listDirection;
};

const filterByDirection = (entries: WordEntry[]) => {
  const activeDirection = getActiveDirection();
  return entries.filter((entry) => {
    const language = getEntryLanguage(entry);
    if (!language) {
      return true;
    }
    if (activeDirection === "EN->ZH") {
      return language === "en";
    }
    return language === "zh";
  });
};

const updateDirectionToggle = () => {
  directionToggle.hidden = false;
  directionToggle.dataset.direction = listDirection;
  directionButtons.forEach((button) => {
    const direction = button.dataset.direction;
    button.setAttribute("aria-pressed", String(direction === listDirection));
  });
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
    const label =
      typeof entry.wordZh === "string" && entry.wordZh.trim()
        ? entry.wordZh.trim()
        : typeof entry.wordEn === "string" && entry.wordEn.trim()
          ? entry.wordEn.trim()
          : "";
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
  translationMode = settings.mode;
  singleDirection = settings.singleDirection;
  if (translationMode === "single") {
    listDirection = singleDirection;
  } else if (modeChanged || settings.lastDirection !== lastDirectionFromSettings) {
    listDirection = settings.lastDirection;
  }
  lastDirectionFromSettings = settings.lastDirection;
  updateDirectionToggle();
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
    const direction = button.dataset.direction;
    if (direction === "EN->ZH" || direction === "ZH->EN") {
      listDirection = direction;
      updateDirectionToggle();
      renderList();
    }
  });
});

void refreshWords();
void refreshTranslationSettings();
void refreshPreferences();

export {};
