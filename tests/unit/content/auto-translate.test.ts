import { beforeEach, describe, expect, it, vi } from "vitest";
import { MessageTypes } from "../../../src/shared/messages";
import type { TranslationDirection } from "../../../src/shared/translation/settings";

let translationEnabled = false;
let translationMode: "single" | "dual" = "single";
let singleDirection: TranslationDirection = "EN->ZH";
let lastDirection: TranslationDirection = "EN->ZH";
let dualPair: "EN<->ZH" | "EN<->JA" | "ZH<->JA" = "EN<->ZH";
let definitionBackfillEnabled = false;
let definitionTranslationEnabled = false;

const showLookupOverlay = vi.fn();
const showTranslationLoading = vi.fn();
const showNotice = vi.fn();

vi.mock("../../../src/shared/translation/settings", () => {
  return {
    TRANSLATION_SETTINGS_KEY: "wordmark:translation:settings",
    readTranslationSettings: vi.fn(async () => ({
      enabled: translationEnabled,
      providerId: "gemini",
      mode: translationMode,
      singleDirection,
      dualPair,
      lastDirection,
      definitionBackfillEnabled,
      definitionTranslationEnabled
    })),
    updateTranslationSettings: vi.fn()
  };
});

vi.mock("../../../src/content/highlight", () => {
  return {
    createHighlightEngine: () => ({
      setWords: vi.fn(),
      setEnabled: vi.fn()
    })
  };
});

vi.mock("../../../src/content/pronounce", () => {
  return {
    canPronounce: () => true,
    playPronunciation: () => true
  };
});

vi.mock("../../../src/content/lookup-overlay", () => {
  return {
    bumpAutoCloseIgnore: vi.fn(),
    captureSelectionRect: vi.fn(() => null),
    getCachedSelectionRect: vi.fn(() => null),
    hideLookupOverlay: vi.fn(),
    installSelectionRectTracking: vi.fn(),
    isOverlayOpen: vi.fn(() => true),
    overlayContainsTarget: vi.fn(() => false),
    resetTranslationUi: vi.fn(),
    setOverlayHideListener: vi.fn(),
    setTranslateAvailable: vi.fn(),
    shouldIgnoreAutoClose: vi.fn(() => false),
    showGeneratedDefinitionError: vi.fn(),
    showTranslationError: vi.fn(),
    showTranslationLoading,
    showGeneratedDefinitionLoading: vi.fn(),
    showLookupOverlay,
    showTranslationResult: vi.fn(),
    showNotice
  };
});

const flushPromises = async () => await new Promise((resolve) => setTimeout(resolve, 0));

const installMinimalDom = (selectionText = "hello") => {
  (globalThis as unknown as { document?: unknown }).document = {
    getElementById: vi.fn(() => null),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  };

  (globalThis as unknown as { window?: unknown }).window = {
    getSelection: () => ({ toString: () => selectionText, rangeCount: 0, isCollapsed: true }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  };
};

const installFakeChromeRuntime = (handlers: {
  onLookup: () => unknown;
  onTranslate: () => unknown;
}) => {
  let messageListener: ((message: unknown) => void) | null = null;

  const sendMessage = vi.fn((message: { type?: string; payload?: unknown }) => {
    if (message.type === MessageTypes.LookupRequest) {
      return Promise.resolve(handlers.onLookup());
    }
    if (message.type === MessageTypes.TranslationRequest) {
      return Promise.resolve(handlers.onTranslate());
    }
    if (message.type === MessageTypes.ListWords) {
      return Promise.resolve({ ok: true, words: [] });
    }
    if (message.type === MessageTypes.GetHighlightPreference) {
      return Promise.resolve({ ok: true, preferences: { highlightEnabled: true } });
    }
    return Promise.resolve({ ok: false, error: "unknown" });
  });

  const runtime = {
    sendMessage,
    onMessage: {
      addListener: vi.fn((listener: (message: unknown) => void) => {
        messageListener = listener;
      })
    },
    getURL: vi.fn((path: string) => path)
  };

  const storage = {
    onChanged: {
      addListener: vi.fn()
    }
  };

  vi.stubGlobal("chrome", { runtime, storage });

  return {
    sendMessage,
    dispatchLookupTrigger: () => {
      messageListener?.({ type: MessageTypes.LookupTrigger });
    }
  };
};

beforeEach(() => {
  vi.resetModules();
  showLookupOverlay.mockClear();
  showTranslationLoading.mockClear();
  showNotice.mockClear();
  translationMode = "single";
  singleDirection = "EN->ZH";
  lastDirection = "EN->ZH";
  dualPair = "EN<->ZH";
  definitionBackfillEnabled = false;
  definitionTranslationEnabled = false;
  installMinimalDom();
});

describe("Spec 002 shortcut-triggered auto-translate", () => {
  it("sends TranslationRequest automatically when enabled (no Translate click)", async () => {
    translationEnabled = true;

    const chromeRuntime = installFakeChromeRuntime({
      onLookup: () => ({
        ok: true,
        entry: { displayWord: "hello", definition: "A greeting.", pronunciationAvailable: true }
      }),
      onTranslate: () => ({ ok: false, error: "not_configured" })
    });

    await import("../../../src/content/index");

    chromeRuntime.dispatchLookupTrigger();
    await flushPromises();

    expect(showLookupOverlay).toHaveBeenCalled();
    const types = chromeRuntime.sendMessage.mock.calls.map(([message]) => (message as { type?: string }).type);
    expect(types).toContain(MessageTypes.LookupRequest);
    expect(types).toContain(MessageTypes.TranslationRequest);
    expect(showTranslationLoading).toHaveBeenCalled();
  });

  it("does not send TranslationRequest when translation is disabled (Spec 001 unchanged)", async () => {
    translationEnabled = false;

    const chromeRuntime = installFakeChromeRuntime({
      onLookup: () => ({
        ok: true,
        entry: { displayWord: "hello", definition: "A greeting.", pronunciationAvailable: true }
      }),
      onTranslate: () => ({ ok: true, translatedWord: "你好" })
    });

    await import("../../../src/content/index");

    chromeRuntime.dispatchLookupTrigger();
    await flushPromises();

    expect(showLookupOverlay).toHaveBeenCalledWith(
      expect.objectContaining({ word: "hello", definition: "A greeting." })
    );

    const types = chromeRuntime.sendMessage.mock.calls.map(([message]) => (message as { type?: string }).type);
    expect(types).toContain(MessageTypes.LookupRequest);
    expect(types).not.toContain(MessageTypes.TranslationRequest);
  });

  it("routes Chinese selections to English translation", async () => {
    translationEnabled = true;
    translationMode = "dual";
    installMinimalDom("你好");

    const chromeRuntime = installFakeChromeRuntime({
      onLookup: () => ({
        ok: true,
        entry: { displayWord: "你好", definition: null, pronunciationAvailable: true }
      }),
      onTranslate: () => ({ ok: true, translatedWord: "hello" })
    });

    await import("../../../src/content/index");

    chromeRuntime.dispatchLookupTrigger();
    await flushPromises();

    const translationCall = chromeRuntime.sendMessage.mock.calls.find(
      ([message]) => (message as { type?: string }).type === MessageTypes.TranslationRequest
    );
    expect(translationCall).toBeTruthy();
    const payload = translationCall?.[0] as { payload?: { targetLang?: string; definition?: string | null } };
    expect(payload.payload?.targetLang).toBe("en");
    expect(payload.payload?.definition ?? null).toBeNull();
  });

  it("blocks Chinese lookups in single EN->ZH mode", async () => {
    translationEnabled = true;
    translationMode = "single";
    singleDirection = "EN->ZH";
    installMinimalDom("你好");

    const chromeRuntime = installFakeChromeRuntime({
      onLookup: () => ({
        ok: true,
        entry: { displayWord: "你好", definition: null, pronunciationAvailable: true }
      }),
      onTranslate: () => ({ ok: false, error: "not_configured" })
    });

    await import("../../../src/content/index");

    chromeRuntime.dispatchLookupTrigger();
    await flushPromises();

    const types = chromeRuntime.sendMessage.mock.calls.map(([message]) => (message as { type?: string }).type);
    expect(types).not.toContain(MessageTypes.LookupRequest);
    expect(showNotice).toHaveBeenCalledWith("当前为 EN→ZH 模式，请到设置切换为 ZH→EN 或开启双向翻译模式");
  });

  it("blocks English lookups in single ZH->EN mode", async () => {
    translationEnabled = true;
    translationMode = "single";
    singleDirection = "ZH->EN";
    installMinimalDom("hello");

    const chromeRuntime = installFakeChromeRuntime({
      onLookup: () => ({
        ok: true,
        entry: { displayWord: "hello", definition: "A greeting.", pronunciationAvailable: true }
      }),
      onTranslate: () => ({ ok: false, error: "not_configured" })
    });

    await import("../../../src/content/index");

    chromeRuntime.dispatchLookupTrigger();
    await flushPromises();

    const types = chromeRuntime.sendMessage.mock.calls.map(([message]) => (message as { type?: string }).type);
    expect(types).not.toContain(MessageTypes.LookupRequest);
    expect(showNotice).toHaveBeenCalledWith("当前为 ZH→EN 模式，请到设置切换为 EN→ZH 或开启双向翻译模式");
  });

  it("shows notice when Japanese lookup occurs while translation is disabled", async () => {
    translationEnabled = false;
    installMinimalDom("こんにちは");

    const chromeRuntime = installFakeChromeRuntime({
      onLookup: () => ({
        ok: true,
        entry: { displayWord: "こんにちは", definition: null, pronunciationAvailable: true }
      }),
      onTranslate: () => ({ ok: false, error: "not_configured" })
    });

    await import("../../../src/content/index");

    chromeRuntime.dispatchLookupTrigger();
    await flushPromises();

    const types = chromeRuntime.sendMessage.mock.calls.map(([message]) => (message as { type?: string }).type);
    expect(types).not.toContain(MessageTypes.LookupRequest);
    expect(types).not.toContain(MessageTypes.TranslationRequest);
    expect(showNotice).toHaveBeenCalledWith("Enable translation to look up Chinese or Japanese words.");
  });

  it("routes English selection to Japanese translation when EN<->JA pair is active", async () => {
    translationEnabled = true;
    translationMode = "dual";
    dualPair = "EN<->JA";
    installMinimalDom("hello");

    const chromeRuntime = installFakeChromeRuntime({
      onLookup: () => ({
        ok: true,
        entry: { displayWord: "hello", definition: "A greeting.", pronunciationAvailable: true }
      }),
      onTranslate: () => ({ ok: true, translatedWord: "こんにちは" })
    });

    await import("../../../src/content/index");

    chromeRuntime.dispatchLookupTrigger();
    await flushPromises();

    const translationCall = chromeRuntime.sendMessage.mock.calls.find(
      ([message]) => (message as { type?: string }).type === MessageTypes.TranslationRequest
    );
    expect(translationCall).toBeTruthy();
    const payload = translationCall?.[0] as { payload?: { targetLang?: string; sourceLang?: string } };
    expect(payload.payload?.targetLang).toBe("ja");
    expect(payload.payload?.sourceLang).toBe("en");
  });
});
