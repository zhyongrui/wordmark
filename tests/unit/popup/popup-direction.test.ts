import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WordEntry } from "../../../src/shared/storage/schema";
import { MessageTypes } from "../../../src/shared/messages";
import type { TranslationSettings } from "../../../src/shared/translation/settings";

let translationSettings: TranslationSettings = {
  enabled: true,
  providerId: "gemini",
  mode: "single",
  singleDirection: "EN->ZH",
  dualPair: "EN<->ZH",
  lastDirection: "EN->ZH",
  definitionBackfillEnabled: false,
  definitionTranslationEnabled: false
};

let words: WordEntry[] = [];

class MockElement {
  [key: string]: unknown;
  private _text = "";
  children: MockElement[] = [];
  attributes: Record<string, string> = {};
  dataset: Record<string, string> = {};
  handlers: Record<string, Array<(...args: unknown[]) => void>> = {};
  hidden = false;
  disabled = false;
  value = "";
  className = "";

  constructor(public tagName: string, public id?: string) {}

  set textContent(value: string) {
    this._text = value;
    this.children = [];
  }

  get textContent() {
    return this._text;
  }

  appendChild(child: MockElement) {
    this.children.push(child);
    return child;
  }

  addEventListener(event: string, handler: (...args: unknown[]) => void) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(handler);
  }

  click() {
    (this.handlers.click ?? []).forEach((handler) => handler({ stopPropagation: () => {} }));
  }

  focus() {}

  querySelectorAll<T>(selector: string): T[] {
    if (selector === ".wordmark-direction-button") {
      return this.children.filter((child) => child.className.includes("wordmark-direction-button")) as T[];
    }
    if (selector === ".wordmark-language-option") {
      return this.children.filter((child) => child.className.includes("wordmark-language-option")) as T[];
    }
    return [];
  }

  querySelector<T>(selector: string): T | null {
    if (!selector.startsWith(".")) {
      return null;
    }
    const className = selector.slice(1);
    return this.children.find((child) => child.className.includes(className)) as T | null;
  }

  contains(target: unknown): boolean {
    if (this === target) {
      return true;
    }
    return this.children.some((child) => child.contains(target));
  }

  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }
}

const buildWord = (input: Partial<WordEntry> & Pick<WordEntry, "normalizedWord" | "displayWord">): WordEntry => ({
  normalizedWord: input.normalizedWord,
  displayWord: input.displayWord,
  wordZh: input.wordZh,
  wordEn: input.wordEn,
  queryCount: input.queryCount ?? 1,
  lastQueriedAt: input.lastQueriedAt ?? new Date().toISOString(),
  definition: input.definition ?? null,
  pronunciationAvailable: input.pronunciationAvailable ?? false
});

const installMockDom = () => {
  const elements: Record<string, MockElement> = {};
  const create = (tag: string, id?: string) => new MockElement(tag, id);

  elements.app = create("main", "app");
  elements["search-input"] = create("input", "search-input");
  elements["word-list"] = create("div", "word-list");
  elements["empty-state"] = create("div", "empty-state");
  elements["word-count"] = create("div", "word-count");
  elements["settings-button"] = create("button", "settings-button");
  elements["highlight-toggle"] = create("button", "highlight-toggle");

  const directionToggle = create("div", "direction-toggle");
  const enButton = create("button");
  enButton.className = "wordmark-direction-button";
  enButton.dataset.direction = "EN->ZH";
  const zhButton = create("button");
  zhButton.className = "wordmark-direction-button";
  zhButton.dataset.direction = "ZH->EN";
  directionToggle.appendChild(enButton);
  directionToggle.appendChild(zhButton);
  elements["direction-toggle"] = directionToggle;

  const languageFilter = create("div", "language-filter");
  const languageToggle = create("button", "language-toggle");
  const languageLabel = create("span");
  languageLabel.className = "wordmark-language-label";
  languageLabel.textContent = "ALL";
  languageToggle.appendChild(languageLabel);
  const languageList = create("div", "language-list");
  const optionAll = create("button");
  optionAll.className = "wordmark-language-option";
  optionAll.dataset.language = "all";
  const optionEn = create("button");
  optionEn.className = "wordmark-language-option";
  optionEn.dataset.language = "en";
  const optionZh = create("button");
  optionZh.className = "wordmark-language-option";
  optionZh.dataset.language = "zh";
  const optionJa = create("button");
  optionJa.className = "wordmark-language-option";
  optionJa.dataset.language = "ja";
  languageList.appendChild(optionAll);
  languageList.appendChild(optionEn);
  languageList.appendChild(optionZh);
  languageList.appendChild(optionJa);
  languageFilter.appendChild(languageToggle);
  languageFilter.appendChild(languageList);
  elements["language-filter"] = languageFilter;
  elements["language-toggle"] = languageToggle;
  elements["language-list"] = languageList;
  elements["language-label"] = languageLabel;

  (globalThis as { document?: unknown }).document = {
    getElementById: (id: string) => elements[id] ?? null,
    createElement: (tag: string) => create(tag),
    addEventListener: vi.fn()
  };

  return elements;
};

const installFakeChromeRuntime = () => {
  const sendMessage = vi.fn((message: { type?: string }) => {
    if (message.type === MessageTypes.ListWords) {
      return Promise.resolve({ ok: true, words });
    }
    if (message.type === MessageTypes.GetHighlightPreference) {
      return Promise.resolve({ ok: true, preferences: { highlightEnabled: true } });
    }
    if (message.type === MessageTypes.SetHighlightPreference) {
      return Promise.resolve({ ok: true, preferences: { highlightEnabled: true } });
    }
    return Promise.resolve({ ok: false, error: "unknown" });
  });

  const runtime = {
    sendMessage,
    openOptionsPage: vi.fn()
  };

  const storage = {
    onChanged: {
      addListener: vi.fn()
    }
  };

  vi.stubGlobal("chrome", { runtime, storage });
};

const findByClass = (root: MockElement, className: string): MockElement | null => {
  if (root.className === className) {
    return root;
  }
  for (const child of root.children) {
    const found = findByClass(child, className);
    if (found) {
      return found;
    }
  }
  return null;
};

const flushPromises = async () => await new Promise((resolve) => setTimeout(resolve, 0));

vi.mock("../../../src/shared/translation/settings", () => {
  return {
    TRANSLATION_SETTINGS_KEY: "wordmark:translation:settings",
    readTranslationSettings: vi.fn(async () => translationSettings)
  };
});

describe("popup direction filtering", () => {
  beforeEach(() => {
    vi.resetModules();
    translationSettings = {
      enabled: true,
      providerId: "gemini",
      mode: "single",
      singleDirection: "EN->ZH",
      dualPair: "EN<->ZH",
      lastDirection: "EN->ZH",
      definitionBackfillEnabled: false,
      definitionTranslationEnabled: false
    };
    words = [
      buildWord({ normalizedWord: "hello", displayWord: "hello", wordZh: "你好" }),
      buildWord({ normalizedWord: "你好", displayWord: "你好", wordEn: "hello" })
    ];
  });

  it("filters list by single EN->ZH direction and shows the current direction", async () => {
    const elements = installMockDom();
    installFakeChromeRuntime();

    await import("../../../src/popup/index");
    await flushPromises();

    expect(elements["direction-toggle"].hidden).toBe(false);
    expect(elements["direction-toggle"].dataset.mode).toBe("single");
    expect(elements["direction-toggle"].dataset.direction).toBe("EN->ZH");
    expect(elements["word-list"].children.length).toBe(1);
    expect(elements["word-count"].textContent).toBe("1 WORDS");
    const wordEl = findByClass(elements["word-list"].children[0], "wordmark-word");
    expect(wordEl?.textContent).toContain("hello");
  });

  it("allows toggling word list in single mode", async () => {
    const elements = installMockDom();
    installFakeChromeRuntime();

    await import("../../../src/popup/index");
    await flushPromises();

    // Initially shows EN words (source language)
    expect(elements["direction-toggle"].hidden).toBe(false);
    expect(elements["direction-toggle"].dataset.mode).toBe("single");
    expect(elements["direction-toggle"].dataset.direction).toBe("EN->ZH");
    expect(elements["word-list"].children.length).toBe(1);
    let wordEl = findByClass(elements["word-list"].children[0], "wordmark-word");
    expect(wordEl?.textContent).toContain("hello");

    // Click ZH button to show ZH words (target language)
    const [, zhButton] = elements["direction-toggle"].children;
    zhButton.click();

    expect(elements["word-list"].children.length).toBe(1);
    wordEl = findByClass(elements["word-list"].children[0], "wordmark-word");
    expect(wordEl?.textContent).toContain("你好");

    // Arrow direction should remain EN->ZH
    expect(elements["direction-toggle"].dataset.direction).toBe("EN->ZH");
  });

  it("toggles list direction in dual mode", async () => {
    translationSettings = {
      enabled: true,
      providerId: "gemini",
      mode: "dual",
      singleDirection: "EN->ZH",
      dualPair: "EN<->ZH",
      lastDirection: "ZH->EN",
      definitionBackfillEnabled: false,
      definitionTranslationEnabled: false
    };

    const elements = installMockDom();
    installFakeChromeRuntime();

    await import("../../../src/popup/index");
    await flushPromises();

    expect(elements["direction-toggle"].hidden).toBe(false);
    expect(elements["word-list"].children.length).toBe(1);
    let wordEl = findByClass(elements["word-list"].children[0], "wordmark-word");
    expect(wordEl?.textContent).toContain("你好");

    const [enButton] = elements["direction-toggle"].children;
    enButton.click();

    wordEl = findByClass(elements["word-list"].children[0], "wordmark-word");
    expect(wordEl?.textContent).toContain("hello");
  });

  it("shows language filter and ignores translation labels when translation is disabled", async () => {
    translationSettings = {
      enabled: false,
      providerId: "gemini",
      mode: "single",
      singleDirection: "EN->ZH",
      dualPair: "EN<->ZH",
      lastDirection: "EN->ZH",
      definitionBackfillEnabled: false,
      definitionTranslationEnabled: false
    };

    words = [
      buildWord({ normalizedWord: "hello", displayWord: "hello", wordZh: "你好" }),
      buildWord({ normalizedWord: "你好", displayWord: "你好", wordEn: "hello" }),
      buildWord({ normalizedWord: "こんにちは", displayWord: "こんにちは", wordEn: "hello" })
    ];

    const elements = installMockDom();
    installFakeChromeRuntime();

    await import("../../../src/popup/index");
    await flushPromises();

    expect(elements["direction-toggle"].hidden).toBe(true);
    expect(elements["language-filter"].hidden).toBe(false);
    expect((elements["language-label"] as MockElement).textContent).toBe("ALL");
    expect(elements["word-list"].children.length).toBe(3);
    expect(elements["word-count"].textContent).toBe("3 WORDS");

    const wordEl = findByClass(elements["word-list"].children[0], "wordmark-word");
    const label = wordEl ? findByClass(wordEl, "wordmark-word-zh") : null;
    expect(label).toBeNull();

    const languageToggle = elements["language-toggle"] as MockElement;
    const languageList = elements["language-list"] as MockElement;
    languageToggle.click();
    const optionZh = languageList.children[2];
    optionZh.click();
    expect(elements["word-list"].children.length).toBe(1);
    const zhWordEl = findByClass(elements["word-list"].children[0], "wordmark-word");
    expect(zhWordEl?.textContent).toContain("你好");
  });
});
