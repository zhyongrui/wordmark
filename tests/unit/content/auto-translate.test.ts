import { beforeEach, describe, expect, it, vi } from "vitest";
import { MessageTypes } from "../../../src/shared/messages";

let translationEnabled = false;

const showLookupOverlay = vi.fn();
const showTranslationLoading = vi.fn();

vi.mock("../../../src/shared/translation/settings", () => {
  return {
    TRANSLATION_SETTINGS_KEY: "wordmark:translation:settings",
    readTranslationSettings: vi.fn(async () => ({ enabled: translationEnabled, providerId: "gemini" })),
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
    showTranslationError: vi.fn(),
    showTranslationLoading,
    showLookupOverlay,
    showTranslationResult: vi.fn(),
    showNotice: vi.fn()
  };
});

const flushPromises = async () => await new Promise((resolve) => setTimeout(resolve, 0));

const installMinimalDom = () => {
  (globalThis as unknown as { document?: unknown }).document = {
    getElementById: vi.fn(() => null),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  };

  (globalThis as unknown as { window?: unknown }).window = {
    getSelection: () => ({ toString: () => "hello", rangeCount: 0, isCollapsed: true }),
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
});
