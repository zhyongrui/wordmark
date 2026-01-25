import { beforeEach, describe, expect, it, vi } from "vitest";
import { MessageTypes } from "../../../src/shared/messages";

let translationEnabled = false;
let translationMode: "single" | "dual" = "single";
let singleDirection: "EN->ZH" | "ZH->EN" = "EN->ZH";
let lastDirection: "EN->ZH" | "ZH->EN" = "EN->ZH";

const showLookupOverlay = vi.fn();
const showTranslationLoading = vi.fn();
const showGeneratedDefinitionError = vi.fn();

vi.mock("../../../src/shared/translation/settings", () => {
  return {
    TRANSLATION_SETTINGS_KEY: "wordmark:translation:settings",
    readTranslationSettings: vi.fn(async () => ({
      enabled: translationEnabled,
      providerId: "gemini",
      mode: translationMode,
      singleDirection,
      dualPair: "EN<->ZH",
      lastDirection
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
    shouldIgnoreAutoClose: vi.fn(() => false),
    showGeneratedDefinitionError,
    showGeneratedDefinitionLoading: vi.fn(),
    showGeneratedDefinitionResult: vi.fn(),
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
    getSelection: () => ({ toString: () => "apple", rangeCount: 0, isCollapsed: true }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  };
};

const installFakeChromeRuntime = (handlers: {
  onLookup: () => unknown;
  onTranslate: () => unknown;
  onBackfill: () => unknown;
}) => {
  let messageListener: ((message: unknown) => void) | null = null;

  const sendMessage = vi.fn((message: { type?: string; payload?: unknown }) => {
    if (message.type === MessageTypes.LookupRequest) {
      return Promise.resolve(handlers.onLookup());
    }
    if (message.type === MessageTypes.TranslationRequest) {
      return Promise.resolve(handlers.onTranslate());
    }
    if (message.type === MessageTypes.DefinitionBackfillRequest) {
      return Promise.resolve(handlers.onBackfill());
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
  showGeneratedDefinitionError.mockClear();
  translationMode = "single";
  singleDirection = "EN->ZH";
  lastDirection = "EN->ZH";
  installMinimalDom();
});

describe("Spec 003 definition backfill fallback UI", () => {
  it("shows a short fallback message (no raw provider details) on provider_error", async () => {
    translationEnabled = true;

    const chromeRuntime = installFakeChromeRuntime({
      onLookup: () => ({
        ok: true,
        entry: {
          displayWord: "apple",
          definition: null,
          definitionSource: "local",
          pronunciationAvailable: true
        }
      }),
      onTranslate: () => ({ ok: true, translatedWord: "苹果" }),
      onBackfill: () => ({
        ok: false,
        error: "provider_error",
        message: "Definition unavailable (HTTP 403) via v1/models/gemini-pro:generateContent. Details: something."
      })
    });

    await import("../../../src/content/index");

    chromeRuntime.dispatchLookupTrigger();
    await flushPromises();
    await flushPromises();

    expect(showLookupOverlay).toHaveBeenCalled();
    expect(showGeneratedDefinitionError).toHaveBeenCalled();
    const message = showGeneratedDefinitionError.mock.calls[0]?.[0] ?? "";
    expect(message).toBe("Definition unavailable.");
  });
});
