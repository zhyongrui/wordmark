import type { WordLanguage } from "../shared/word/normalize";

type OverlayContent = {
  word: string;
  definition: string | null;
  suppressFallback?: boolean;
  pronunciationAvailable: boolean;
  status?: string;
  onPronounce?: () => void;
  anchorRect?: AnchorRect | null;
  saveEnabled?: boolean;
  highlightEnabled?: boolean;
  initialTranslation?: string;
  initialDefinitionTranslation?: string;
};

export type AnchorRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

const OVERLAY_ID = "wordmark-overlay";
const STYLE_ID = "wordmark-overlay-style";
const BASE_CLASS = "wordmark-overlay";
const CORNER_CLASS = "wordmark-overlay--corner";
const ANCHORED_CLASS = "wordmark-overlay--anchored";
const WORDMARK_ROOT_ATTR = "data-wordmark-root";
let ignoreAutoCloseUntil = 0;
let lastPointer: { x: number; y: number } | null = null;
let pointerTrackingInstalled = false;
let lastSelectionRect: AnchorRect | null = null;
let lastSelectionRectAt = 0;
let lastSelectionRange: Range | null = null;
let lastSelectionRangeAt = 0;
let selectionCapturePending = false;
let overlayHideListener: (() => void) | null = null;
let selectionTrackingInstalled = false;
let positionAttemptId = 0;
let currentWordSaveEnabled = true;
let currentWordHighlightEnabled = true;
let onWordSaveToggle: ((enabled: boolean) => void) | null = null;
let onWordHighlightToggle: ((enabled: boolean) => void) | null = null;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const bumpAutoCloseIgnore = (ms = 200) => {
  ignoreAutoCloseUntil = Date.now() + ms;
};

export const shouldIgnoreAutoClose = () => Date.now() < ignoreAutoCloseUntil;

const updateToggleButtonState = (button: HTMLButtonElement, isActive: boolean) => {
  if (isActive) {
    button.classList.add("is-active");
  } else {
    button.classList.remove("is-active");
  }
};

// Custom tooltip with shorter delay and positioned above buttons
const setupCustomTooltip = (button: HTMLElement, text: string) => {
  // Remove native title to prevent duplicate tooltips
  button.removeAttribute("title");

  // Create tooltip element
  const tooltip = document.createElement("span");
  tooltip.className = "wordmark-tooltip";
  tooltip.textContent = text;
  button.style.position = "relative";
  button.appendChild(tooltip);

  let showTimeout: number | null = null;
  let hideTimeout: number | null = null;

  const showTooltip = () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    if (showTimeout) return;
    showTimeout = window.setTimeout(() => {
      tooltip.classList.add("visible");
      showTimeout = null;
    }, 300); // 300ms delay (shorter than browser default)
  };

  const hideTooltip = () => {
    if (showTimeout) {
      clearTimeout(showTimeout);
      showTimeout = null;
    }
    if (hideTimeout) return;
    hideTimeout = window.setTimeout(() => {
      tooltip.classList.remove("visible");
      hideTimeout = null;
    }, 100);
  };

  button.addEventListener("mouseenter", showTooltip);
  button.addEventListener("mouseleave", hideTooltip);
  button.addEventListener("focus", showTooltip);
  button.addEventListener("blur", hideTooltip);
};

export const setWordSaveEnabled = (enabled: boolean) => {
  currentWordSaveEnabled = enabled;
  const overlay = getExistingOverlay();
  if (overlay) {
    updateToggleButtonState(overlay.saveToggle, enabled);
  }
  onWordSaveToggle?.(enabled);
};

export const setWordHighlightEnabled = (enabled: boolean) => {
  currentWordHighlightEnabled = enabled;
  const overlay = getExistingOverlay();
  if (overlay) {
    updateToggleButtonState(overlay.highlightToggle, enabled);
  }
  onWordHighlightToggle?.(enabled);
};

export const getWordSaveEnabled = () => currentWordSaveEnabled;
export const getWordHighlightEnabled = () => currentWordHighlightEnabled;

export const setWordSaveToggleHandler = (handler: ((enabled: boolean) => void) | null) => {
  onWordSaveToggle = handler;
};

export const setWordHighlightToggleHandler = (handler: ((enabled: boolean) => void) | null) => {
  onWordHighlightToggle = handler;
};

const ensurePointerTracking = () => {
  if (pointerTrackingInstalled) {
    return;
  }
  pointerTrackingInstalled = true;
  document.addEventListener(
    "pointerup",
    (event) => {
      lastPointer = { x: event.clientX, y: event.clientY };
    },
    true
  );
};

const waitFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

const waitForFontsReady = async (timeoutMs = 200) => {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts?.ready) {
    return;
  }
  try {
    await Promise.race([
      fonts.ready,
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, timeoutMs);
      })
    ]);
  } catch {
    // Ignore font loading errors; fallback to current layout.
  }
};

const getRangeElement = (range: Range): Element | null => {
  const node = range.commonAncestorContainer;
  if (node.nodeType === Node.ELEMENT_NODE) {
    return node as Element;
  }
  return node.parentElement;
};

const isRangeInsideCode = (range: Range): boolean => {
  const element = getRangeElement(range);
  if (!element) {
    return false;
  }
  return Boolean(element.closest("code, pre"));
};

const getRangeRect = (range: Range): AnchorRect | null => {
  const rects = Array.from(range.getClientRects());
  const firstRect = rects.find((candidate) => candidate.width > 0 && candidate.height > 0) ?? null;
  const boundingRect = range.getBoundingClientRect();
  const rect =
    firstRect ??
    (boundingRect.width > 0 && boundingRect.height > 0 ? boundingRect : null);
  if (!rect) {
    return null;
  }

  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height
  };
};

const getSelectionRect = (): AnchorRect | null => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (range.collapsed) {
    return null;
  }

  return getRangeRect(range);
};

const getStableRangeRect = async (
  range: Range,
  maxFrames = 8,
  stableThreshold = 1.5,
  minFrames = 0,
  onSample?: (stage: string) => void
): Promise<AnchorRect | null> => {
  let lastRect: AnchorRect | null = null;
  let stableCount = 0;

  for (let i = 0; i < maxFrames; i += 1) {
    await waitFrame();
    if (onSample && i < 2) {
      onSample(`sample-${i + 1}`);
    }
    const rect = getRangeRect(range);
    if (!rect) {
      lastRect = null;
      stableCount = 0;
      continue;
    }

    if (lastRect) {
      const delta =
        Math.abs(rect.left - lastRect.left) +
        Math.abs(rect.top - lastRect.top) +
        Math.abs(rect.width - lastRect.width) +
        Math.abs(rect.height - lastRect.height);
      if (delta < stableThreshold) {
        stableCount += 1;
        if (stableCount >= 2 && i + 1 >= minFrames) {
          if (onSample) {
            onSample("stable");
          }
          return rect;
        }
      } else {
        stableCount = 0;
      }
    }

    lastRect = rect;
  }

  if (onSample) {
    onSample("sample-final");
  }
  return lastRect;
};

const scheduleSelectionRectCapture = () => {
  if (selectionCapturePending) {
    return;
  }
  selectionCapturePending = true;
  requestAnimationFrame(() => {
    selectionCapturePending = false;
    const rect = getSelectionRect();
    if (rect) {
      lastSelectionRect = rect;
      lastSelectionRectAt = Date.now();
    }
  });
};

const isSelectionInsideWordMark = (selection: Selection): boolean => {
  const node = selection.anchorNode ?? selection.focusNode;
  const element = node
    ? node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement
    : null;
  if (!element) {
    return false;
  }
  return Boolean(element.closest(`[${WORDMARK_ROOT_ATTR}]`));
};

const updateSelectionRectCache = () => {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    return;
  }
  if (isSelectionInsideWordMark(selection)) {
    return;
  }

  const range = selection.getRangeAt(0);
  lastSelectionRange = range.cloneRange();
  lastSelectionRangeAt = Date.now();

  const rect = getRangeRect(range);
  if (rect) {
    lastSelectionRect = rect;
    lastSelectionRectAt = Date.now();
    return;
  }

  scheduleSelectionRectCapture();
};

export const installSelectionRectTracking = () => {
  if (selectionTrackingInstalled) {
    return;
  }
  selectionTrackingInstalled = true;
  document.addEventListener("selectionchange", updateSelectionRectCache);
  document.addEventListener("mouseup", updateSelectionRectCache, true);
};

const getRecentSelectionRect = (maxAgeMs = 1500): AnchorRect | null => {
  if (!lastSelectionRect) {
    return null;
  }
  if (Date.now() - lastSelectionRectAt > maxAgeMs) {
    return null;
  }
  return lastSelectionRect;
};

const getRecentSelectionRange = (maxAgeMs = 1500): Range | null => {
  if (!lastSelectionRange) {
    return null;
  }
  if (Date.now() - lastSelectionRangeAt > maxAgeMs) {
    return null;
  }
  return lastSelectionRange;
};

export const getCachedSelectionRect = (): AnchorRect | null => getRecentSelectionRect();

const applyCornerPosition = (root: HTMLElement) => {
  root.classList.remove(ANCHORED_CLASS);
  root.classList.add(CORNER_CLASS);
  root.style.left = "auto";
  root.style.top = "auto";
  root.style.right = "";
  root.style.bottom = "";
  root.style.visibility = "visible";
};

const applyAnchoredPosition = (root: HTMLElement, rect: AnchorRect, gap: number) => {
  lastSelectionRect = rect;
  lastSelectionRectAt = Date.now();

  const overlayWidth = root.offsetWidth;
  const overlayHeight = root.offsetHeight;
  let left = rect.right + gap;
  let top = rect.bottom + gap;

  if (left + overlayWidth > window.innerWidth - gap) {
    left = rect.left - overlayWidth - gap;
  }

  if (top + overlayHeight > window.innerHeight - gap) {
    top = rect.top - overlayHeight - gap;
  }

  left = clamp(left, gap, window.innerWidth - overlayWidth - gap);
  top = clamp(top, gap, window.innerHeight - overlayHeight - gap);

  root.style.right = "auto";
  root.style.bottom = "auto";
  root.style.left = `${left}px`;
  root.style.top = `${top}px`;
  root.style.visibility = "visible";
};

const schedulePositionCorrection = (
  root: HTMLElement,
  range: Range,
  baseRect: AnchorRect,
  attemptId: number
) => {
  window.setTimeout(async () => {
    if (positionAttemptId !== attemptId || root.hidden || !root.isConnected) {
      return;
    }
    const rect = await getStableRangeRect(range, 6, 1.5, 3);
    if (!rect) {
      return;
    }
    const delta =
      Math.abs(rect.left - baseRect.left) +
      Math.abs(rect.top - baseRect.top) +
      Math.abs(rect.width - baseRect.width) +
      Math.abs(rect.height - baseRect.height);
    if (delta < 6) {
      return;
    }
    applyAnchoredPosition(root, rect, 10);
  }, 180);
};

const positionOverlay = async (root: HTMLElement, anchorRect?: AnchorRect | null) => {
  root.classList.remove(CORNER_CLASS);
  root.classList.add(ANCHORED_CLASS);
  root.hidden = false;
  root.style.visibility = "hidden";

  const attemptId = ++positionAttemptId;
  const gap = 10;
  const providedRect =
    anchorRect && (anchorRect.width > 0 || anchorRect.height > 0) ? anchorRect : null;
  const selection = window.getSelection();
  const liveRange =
    selection && selection.rangeCount > 0 && !selection.isCollapsed
      ? selection.getRangeAt(0).cloneRange()
      : null;
  const cachedRange = getRecentSelectionRange();
  const rangeForSampling = liveRange ?? cachedRange;
  const isCodeSelection = rangeForSampling ? isRangeInsideCode(rangeForSampling) : false;
  if (rangeForSampling && isCodeSelection) {
    await waitForFontsReady(240);
  }
  const sampledRect = rangeForSampling
    ? await getStableRangeRect(
        rangeForSampling,
        isCodeSelection ? 12 : 8,
        1.5,
        isCodeSelection ? 4 : 0
      )
    : null;
  const rect = sampledRect ?? providedRect ?? getRecentSelectionRect();

  if (!rect && lastPointer) {
    const overlayWidth = root.offsetWidth;
    const overlayHeight = root.offsetHeight;
    const left = clamp(lastPointer.x + gap, gap, window.innerWidth - overlayWidth - gap);
    const top = clamp(lastPointer.y + gap, gap, window.innerHeight - overlayHeight - gap);
    root.style.right = "auto";
    root.style.bottom = "auto";
    root.style.left = `${left}px`;
    root.style.top = `${top}px`;
    root.style.visibility = "visible";
    return;
  }

  if (!rect) {
    applyCornerPosition(root);
    return;
  }

  applyAnchoredPosition(root, rect, gap);
  if (rangeForSampling && isCodeSelection) {
    schedulePositionCorrection(root, rangeForSampling, rect, attemptId);
  }
};

const ensureStyles = () => {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const link = document.createElement("link");
  link.id = STYLE_ID;
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("lookup-overlay.css");
  document.head.appendChild(link);
};

const PRONOUNCE_LABEL = "Play pronunciation";
const SAVE_LABEL = "Save to word list";

const ensureSaveToggleIcon = (button: HTMLButtonElement) => {
  if (button.querySelector(".wordmark-toggle-icon")) {
    return;
  }

  button.textContent = "";
  const icon = document.createElement("span");
  icon.className = "wordmark-toggle-icon";
  icon.textContent = "📋";
  button.appendChild(icon);
};

const createSpeakerIcon = () => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("wordmark-icon", "wordmark-icon--speaker");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
  );
  path.setAttribute("fill", "currentColor");
  svg.appendChild(path);
  return svg;
};

const ensurePronounceButtonIcon = (button: HTMLButtonElement) => {
  button.setAttribute("aria-label", PRONOUNCE_LABEL);
  button.title = PRONOUNCE_LABEL;

  if (button.querySelector(".wordmark-icon--speaker")) {
    return;
  }

  button.textContent = "";
  button.appendChild(createSpeakerIcon());
};

const ensureHighlightToggleIcon = (button: HTMLButtonElement) => {
  if (button.querySelector(".wordmark-icon--highlight")) {
    return;
  }

  button.textContent = "";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("wordmark-icon", "wordmark-icon--highlight");

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
  gradient.setAttribute("id", "wm-highlight-grad");
  gradient.setAttribute("x1", "0");
  gradient.setAttribute("y1", "0");
  gradient.setAttribute("x2", "1");
  gradient.setAttribute("y2", "1");

  const stopStart = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stopStart.setAttribute("offset", "0%");
  stopStart.setAttribute("stop-color", "#f7c84b");

  const stopEnd = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stopEnd.setAttribute("offset", "100%");
  stopEnd.setAttribute("stop-color", "#f0791a");

  gradient.appendChild(stopStart);
  gradient.appendChild(stopEnd);
  defs.appendChild(gradient);
  svg.appendChild(defs);

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute(
    "transform",
    "translate(12 12) rotate(-35) scale(1.3) translate(-12 -12)"
  );

  const nib = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  nib.setAttribute("points", "3,12 5,10 7,10 6,14 3,14");
  nib.setAttribute("fill", "url(#wm-highlight-grad)");

  const neck = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  neck.setAttribute("x", "7");
  neck.setAttribute("y", "10");
  neck.setAttribute("width", "2");
  neck.setAttribute("height", "4");
  neck.setAttribute("rx", "0.6");
  neck.setAttribute("fill", "url(#wm-highlight-grad)");

  const body = document.createElementNS("http://www.w3.org/2000/svg", "path");
  body.setAttribute(
    "d",
    "M10 9.2h7.6a1.6 1.6 0 0 1 1.6 1.6v3.8a1.6 1.6 0 0 1-1.6 1.6H10a1.6 1.6 0 0 1-1.6-1.6v-3.8a1.6 1.6 0 0 1 1.6-1.6zM12 10.7a0.9 0.9 0 0 0-0.9 0.9v2.2a0.9 0.9 0 0 0 0.9 0.9h2.3a0.9 0.9 0 0 0 0.9-0.9v-2.2a0.9 0.9 0 0 0-0.9-0.9H12z"
  );
  body.setAttribute("fill", "url(#wm-highlight-grad)");
  body.setAttribute("fill-rule", "evenodd");

  const cap = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  cap.setAttribute("x", "18");
  cap.setAttribute("y", "9");
  cap.setAttribute("width", "4");
  cap.setAttribute("height", "6");
  cap.setAttribute("rx", "1.8");
  cap.setAttribute("fill", "url(#wm-highlight-grad)");

  group.appendChild(nib);
  group.appendChild(neck);
  group.appendChild(body);
  group.appendChild(cap);
  svg.appendChild(group);
  button.appendChild(svg);
};

const createOverlay = () => {
  const root = document.createElement("section");
  root.id = OVERLAY_ID;
  root.className = `${BASE_CLASS} ${CORNER_CLASS}`;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-live", "polite");
  root.setAttribute(WORDMARK_ROOT_ATTR, "true");

  const header = document.createElement("div");
  header.className = "wordmark-header";

  const title = document.createElement("div");
  title.textContent = "WordMark";

  const headerControls = document.createElement("div");
  headerControls.className = "wordmark-header-controls";

  const saveToggle = document.createElement("button");
  saveToggle.className = "wordmark-toggle wordmark-toggle--save";
  saveToggle.type = "button";
  saveToggle.setAttribute("aria-label", "Toggle save to word list");
  ensureSaveToggleIcon(saveToggle);
  setupCustomTooltip(saveToggle, SAVE_LABEL);
  saveToggle.addEventListener("click", () => {
    setWordSaveEnabled(!currentWordSaveEnabled);
  });

  const highlightToggle = document.createElement("button");
  highlightToggle.className = "wordmark-toggle wordmark-toggle--highlight";
  highlightToggle.type = "button";
  highlightToggle.setAttribute("aria-label", "Toggle highlight on page");
  ensureHighlightToggleIcon(highlightToggle);
  setupCustomTooltip(highlightToggle, "Highlight on page");
  highlightToggle.addEventListener("click", () => {
    setWordHighlightEnabled(!currentWordHighlightEnabled);
  });

  const close = document.createElement("button");
  close.className = "wordmark-close";
  close.type = "button";
  close.textContent = "×";
  close.addEventListener("click", () => {
    hideLookupOverlay();
  });

  headerControls.appendChild(saveToggle);
  headerControls.appendChild(highlightToggle);
  headerControls.appendChild(close);

  header.appendChild(title);
  header.appendChild(headerControls);

  const word = document.createElement("div");
  word.className = "wordmark-word";

  const definition = document.createElement("div");
  definition.className = "wordmark-definition";

  const actions = document.createElement("div");
  actions.className = "wordmark-actions";

  const pronounce = document.createElement("button");
  pronounce.className = "wordmark-button wordmark-button--pronounce";
  pronounce.type = "button";
  ensurePronounceButtonIcon(pronounce);

  actions.appendChild(pronounce);

  const translation = document.createElement("div");
  translation.className = "wordmark-translation";
  translation.hidden = true;

  const translationTitle = document.createElement("div");
  translationTitle.className = "wordmark-translation-title";
  translationTitle.textContent = "English definition";

  const translationWordLabel = document.createElement("div");
  translationWordLabel.className = "wordmark-translation-label wordmark-translation-word-label";
  translationWordLabel.textContent = "Definition (EN)";

  const translationWord = document.createElement("div");
  translationWord.className = "wordmark-translation-value wordmark-translation-word";

  const translationDefinitionLabel = document.createElement("div");
  translationDefinitionLabel.className = "wordmark-translation-label wordmark-translation-definition-label";
  translationDefinitionLabel.textContent = "Definition (ZH)";

  const translationDefinition = document.createElement("div");
  translationDefinition.className = "wordmark-translation-value wordmark-translation-definition";

  const translationStatus = document.createElement("div");
  translationStatus.className = "wordmark-translation-status";

  translation.appendChild(translationTitle);
  translation.appendChild(translationWordLabel);
  translation.appendChild(translationWord);
  translation.appendChild(translationDefinitionLabel);
  translation.appendChild(translationDefinition);
  translation.appendChild(translationStatus);

  const status = document.createElement("div");
  status.className = "wordmark-status";

  root.appendChild(header);
  root.appendChild(word);
  root.appendChild(definition);
  root.appendChild(actions);
  root.appendChild(translation);
  root.appendChild(status);

  (document.documentElement ?? document.body).appendChild(root);

  return {
    root,
    word,
    definition,
    pronounce,
    saveToggle,
    highlightToggle,
    translation,
    translationTitle,
    translationWordLabel,
    translationWord,
    translationDefinitionLabel,
    translationDefinition,
    translationStatus,
    status
  };
};

type OverlayElements = ReturnType<typeof createOverlay>;

let cachedOverlay: OverlayElements | null = null;

const getExistingOverlay = (): OverlayElements | null => {
  if (cachedOverlay && document.body.contains(cachedOverlay.root)) {
    return cachedOverlay;
  }

  const existing = document.getElementById(OVERLAY_ID) as HTMLElement | null;
  if (!existing) {
    cachedOverlay = null;
    return null;
  }

  const actions = existing.querySelector(".wordmark-actions") as HTMLDivElement | null;

  const saveToggleButtons = existing.querySelectorAll<HTMLButtonElement>(".wordmark-toggle--save");
  const saveToggle = saveToggleButtons[0] ?? document.createElement("button");
  saveToggleButtons.forEach((button, index) => {
    if (index > 0) {
      button.remove();
    }
  });
  saveToggle.classList.add("wordmark-toggle", "wordmark-toggle--save");
  saveToggle.type = "button";
  saveToggle.setAttribute("aria-label", "Toggle save to word list");
  ensureSaveToggleIcon(saveToggle);
  if (!saveToggle.querySelector(".wordmark-tooltip")) {
    setupCustomTooltip(saveToggle, SAVE_LABEL);
  }

  const highlightToggleButtons = existing.querySelectorAll<HTMLButtonElement>(".wordmark-toggle--highlight");
  const highlightToggle = highlightToggleButtons[0] ?? document.createElement("button");
  highlightToggleButtons.forEach((button, index) => {
    if (index > 0) {
      button.remove();
    }
  });
  highlightToggle.classList.add("wordmark-toggle", "wordmark-toggle--highlight");
  highlightToggle.type = "button";
  highlightToggle.setAttribute("aria-label", "Toggle highlight on page");
  ensureHighlightToggleIcon(highlightToggle);
  if (!highlightToggle.querySelector(".wordmark-tooltip")) {
    setupCustomTooltip(highlightToggle, "Highlight on page");
  }

  // Ensure header controls container exists
  const header = existing.querySelector(".wordmark-header") as HTMLDivElement | null;
  if (header) {
    let headerControls = header.querySelector(".wordmark-header-controls") as HTMLDivElement | null;
    if (!headerControls) {
      headerControls = document.createElement("div");
      headerControls.className = "wordmark-header-controls";
      header.appendChild(headerControls);
    }
    if (!saveToggleButtons[0]) {
      headerControls.insertBefore(saveToggle, headerControls.firstChild);
    }
    if (!highlightToggleButtons[0]) {
      const closeButton = headerControls.querySelector(".wordmark-close");
      if (closeButton) {
        headerControls.insertBefore(highlightToggle, closeButton);
      } else {
        headerControls.appendChild(highlightToggle);
      }
    }
  }

  const pronounceButtons = existing.querySelectorAll<HTMLButtonElement>(".wordmark-button--pronounce");
  const pronounce = pronounceButtons[0] ?? document.createElement("button");
  pronounceButtons.forEach((button, index) => {
    if (index > 0) {
      button.remove();
    }
  });
  pronounce.classList.add("wordmark-button", "wordmark-button--pronounce");
  pronounce.type = "button";
  ensurePronounceButtonIcon(pronounce);
  if (!pronounceButtons[0]) {
    actions?.appendChild(pronounce);
  }

  const translateButtons = existing.querySelectorAll<HTMLButtonElement>(".wordmark-button--translate");
  translateButtons.forEach((button) => button.remove());

  let translation = existing.querySelector(".wordmark-translation") as HTMLDivElement | null;
  if (!translation) {
    translation = document.createElement("div");
    translation.className = "wordmark-translation";
    translation.hidden = true;
    existing.insertBefore(translation, existing.querySelector(".wordmark-status"));
  }

  const ensureChild = <T extends HTMLElement>(selector: string, create: () => T): T => {
    const found = translation.querySelector(selector) as T | null;
    if (found) {
      return found;
    }
    const next = create();
    translation.appendChild(next);
    return next;
  };

  const translationTitle = ensureChild(".wordmark-translation-title", () => {
    const element = document.createElement("div");
    element.className = "wordmark-translation-title";
    element.textContent = "English definition";
    return element;
  });

  const translationWordLabel = ensureChild(".wordmark-translation-word-label", () => {
    const element = document.createElement("div");
    element.className = "wordmark-translation-label wordmark-translation-word-label";
    element.textContent = "Definition (EN)";
    return element;
  });

  const translationWord = ensureChild(".wordmark-translation-word", () => {
    const element = document.createElement("div");
    element.className = "wordmark-translation-value wordmark-translation-word";
    return element;
  });

  const translationDefinitionLabel = ensureChild(".wordmark-translation-definition-label", () => {
    const element = document.createElement("div");
    element.className = "wordmark-translation-label wordmark-translation-definition-label";
    element.textContent = "Definition (ZH)";
    return element;
  });

  const translationDefinition = ensureChild(".wordmark-translation-definition", () => {
    const element = document.createElement("div");
    element.className = "wordmark-translation-value wordmark-translation-definition";
    return element;
  });

  const translationStatus = ensureChild(".wordmark-translation-status", () => {
    const element = document.createElement("div");
    element.className = "wordmark-translation-status";
    return element;
  });

  cachedOverlay = {
    root: existing,
    word: existing.querySelector(".wordmark-word") as HTMLDivElement,
    definition: existing.querySelector(".wordmark-definition") as HTMLDivElement,
    pronounce,
    saveToggle,
    highlightToggle,
    translation,
    translationTitle,
    translationWordLabel,
    translationWord,
    translationDefinitionLabel,
    translationDefinition,
    translationStatus,
    status: existing.querySelector(".wordmark-status") as HTMLDivElement
  };
  return cachedOverlay;
};

const normalizeEnglishDefinition = (definition: string | null): string => {
  const value = typeof definition === "string" ? definition.trim() : "";
  return value ? value : "Definition unavailable.";
};

const setDefinitionLabels = (
  overlay: OverlayElements,
  sourceLang: WordLanguage,
  targetLang?: TranslationTargetLang
) => {
  // Determine the target language if not provided
  const effectiveTargetLang = targetLang ?? (sourceLang === "zh" ? "en" : sourceLang === "ja" ? "en" : "zh");

  // Get language display names
  const getLanguageLabel = (lang: WordLanguage | TranslationTargetLang): string => {
    switch (lang) {
      case "en":
        return "EN";
      case "zh":
        return "ZH";
      case "ja":
        return "JA";
      default:
        return lang.toUpperCase();
    }
  };

  const getLanguageTitle = (lang: WordLanguage | TranslationTargetLang): string => {
    switch (lang) {
      case "en":
        return "English";
      case "zh":
        return "Chinese";
      case "ja":
        return "Japanese";
      default:
        return lang;
    }
  };

  overlay.translationTitle.textContent = `${getLanguageTitle(sourceLang)} definition`;
  overlay.translationWordLabel.textContent = `Definition (${getLanguageLabel(sourceLang)})`;
  overlay.translationDefinitionLabel.textContent = `Definition (${getLanguageLabel(effectiveTargetLang)})`;
};

export const resetTranslationUi = (
  englishDefinition: string | null,
  sourceLang: WordLanguage = "en",
  options: { suppressFallback?: boolean } = {}
) => {
  const overlay = getExistingOverlay();
  if (!overlay) {
    return;
  }

  const suppressFallback = options.suppressFallback === true;
  const trimmedDefinition =
    typeof englishDefinition === "string" && englishDefinition.trim() ? englishDefinition.trim() : "";
  if (suppressFallback && !trimmedDefinition) {
    overlay.definition.textContent = "";
  } else {
    overlay.definition.textContent =
      sourceLang === "zh" ? "Translation unavailable." : normalizeEnglishDefinition(englishDefinition);
  }
  overlay.translation.hidden = true;
  overlay.translationWord.textContent = "";
  overlay.translationDefinitionLabel.style.display = "none";
  overlay.translationDefinition.style.display = "none";
  overlay.translationDefinition.textContent = "";
  overlay.translationStatus.textContent = "";
};

export const showTranslationLoading = (
  sourceLang: WordLanguage = "en",
  options: { definitionAvailable?: boolean; preserveDefinitionArea?: boolean; definitionText?: string | null } = {}
) => {
  const overlay = getExistingOverlay();
  if (!overlay) {
    return;
  }

  const preserveDefinitionArea = options.preserveDefinitionArea === true;

  if (sourceLang === "zh") {
    overlay.translation.hidden = true;
    overlay.translationWord.textContent = "";
    overlay.translationDefinitionLabel.style.display = "none";
    overlay.translationDefinition.style.display = "none";
    overlay.translationDefinition.textContent = "";
    overlay.translationStatus.textContent = "";
    overlay.definition.textContent = "Translating…";
    return;
  }

  if (options.definitionAvailable === false) {
    overlay.translation.hidden = true;
    overlay.translationWord.textContent = "";
    overlay.translationDefinitionLabel.style.display = "none";
    overlay.translationDefinition.style.display = "none";
    overlay.translationDefinition.textContent = "";
    overlay.translationStatus.textContent = "";
    overlay.definition.textContent = "Translating…";
    return;
  }

  const definitionText =
    typeof options.definitionText === "string"
      ? options.definitionText
      : preserveDefinitionArea
        ? overlay.translationWord.textContent
        : overlay.definition.textContent;
  const englishDefinitionText = normalizeEnglishDefinition(definitionText);

  overlay.translation.hidden = false;
  setDefinitionLabels(overlay, sourceLang);
  overlay.translationWord.textContent = englishDefinitionText;

  if (!preserveDefinitionArea) {
    overlay.definition.textContent = "Translating…";
  }

  const showDefinitionTranslation = englishDefinitionText !== "Definition unavailable.";
  overlay.translationDefinitionLabel.style.display = showDefinitionTranslation ? "block" : "none";
  overlay.translationDefinition.style.display = showDefinitionTranslation ? "block" : "none";
  overlay.translationDefinition.textContent = "";
  overlay.translationStatus.textContent = preserveDefinitionArea ? "Translating…" : "";
};

export const showGeneratedDefinitionLoading = (sourceLang: WordLanguage = "en") => {
  const overlay = getExistingOverlay();
  if (!overlay) {
    return;
  }

  overlay.translation.hidden = false;
  setDefinitionLabels(overlay, sourceLang);
  overlay.translationWord.textContent = "Loading…";
  overlay.translationDefinitionLabel.style.display = "none";
  overlay.translationDefinition.style.display = "none";
  overlay.translationDefinition.textContent = "";
  overlay.translationStatus.textContent = "";
};

export type TranslationOverlayModel = {
  topText: string;
  englishDefinitionText: string;
  definitionZhText: string | null;
};

export const mapTranslationOverlayModel = (input: {
  englishDefinition: string | null;
  translation: import("../shared/translation/types").TranslationResponse;
}): TranslationOverlayModel => {
  const englishDefinitionText = normalizeEnglishDefinition(input.englishDefinition);
  const translation = input.translation;

  if (translation.ok) {
    const word = translation.translatedWord.trim();
    const translatedDefinition =
      englishDefinitionText !== "Definition unavailable." && typeof translation.translatedDefinition === "string"
        ? translation.translatedDefinition.trim()
        : "";

    return {
      topText: word || "Translation unavailable.",
      englishDefinitionText,
      definitionZhText: translatedDefinition ? translatedDefinition : null
    };
  }

  if (translation.error === "not_configured") {
    return {
      topText: "Translation not configured. Set an API key in Options.",
      englishDefinitionText,
      definitionZhText: null
    };
  }

  const base = typeof translation.message === "string" && translation.message.trim() ? translation.message.trim() : "";
  const message = base || "Translation unavailable.";
  return {
    topText: `${message} Press the shortcut again to retry.`,
    englishDefinitionText,
    definitionZhText: null
  };
};

export const showTranslationResult = (
  result: { translatedWord: string; translatedDefinition?: string | null },
  sourceLang: WordLanguage = "en",
  options: { definitionAvailable?: boolean; preserveDefinitionArea?: boolean } = {}
) => {
  const overlay = getExistingOverlay();
  if (!overlay) {
    return;
  }

  if (sourceLang === "zh") {
    const translatedWord = result.translatedWord.trim();
    overlay.definition.textContent = translatedWord || "Translation unavailable.";
    return;
  }

  if (options.definitionAvailable === false) {
    const translatedWord = result.translatedWord.trim();
    if (!options.preserveDefinitionArea) {
      overlay.translation.hidden = true;
      overlay.translationWord.textContent = "";
      overlay.translationDefinitionLabel.style.display = "none";
      overlay.translationDefinition.style.display = "none";
      overlay.translationDefinition.textContent = "";
      overlay.translationStatus.textContent = "";
    }
    overlay.definition.textContent = translatedWord || "Translation unavailable.";
    return;
  }

  overlay.translation.hidden = false;
  overlay.translationTitle.textContent = "English definition";

  const model = mapTranslationOverlayModel({
    englishDefinition: overlay.translationWord.textContent,
    translation: {
      ok: true,
      translatedWord: result.translatedWord,
      translatedDefinition: typeof result.translatedDefinition === "string" ? result.translatedDefinition : null
    }
  });

  if (!options.preserveDefinitionArea) {
    overlay.definition.textContent = model.topText;
  }
  overlay.translationWordLabel.textContent = "Definition (EN)";
  overlay.translationWord.textContent = model.englishDefinitionText;

  if (model.definitionZhText) {
    overlay.translationDefinitionLabel.style.display = "block";
    overlay.translationDefinition.style.display = "block";
    overlay.translationDefinition.textContent = model.definitionZhText;
  } else {
    overlay.translationDefinitionLabel.style.display = "none";
    overlay.translationDefinition.style.display = "none";
    overlay.translationDefinition.textContent = "";
  }
  overlay.translationStatus.textContent = "";
};

export const showTranslationError = (
  message: string,
  sourceLang: WordLanguage = "en",
  options: { definitionAvailable?: boolean; preserveDefinitionArea?: boolean } = {}
) => {
  const overlay = getExistingOverlay();
  if (!overlay) {
    return;
  }

  if (sourceLang === "zh") {
    const trimmed = message.trim();
    const includeRetryHint = !/not configured/i.test(trimmed) && !/shortcut again to retry/i.test(trimmed);
    overlay.definition.textContent = includeRetryHint ? `${trimmed} Press the shortcut again to retry.` : trimmed;
    return;
  }

  const trimmed = message.trim();
  const includeRetryHint = !/not configured/i.test(trimmed) && !/shortcut again to retry/i.test(trimmed);
  if (options.definitionAvailable === false) {
    if (!options.preserveDefinitionArea) {
      overlay.translation.hidden = true;
      overlay.translationWord.textContent = "";
      overlay.translationDefinitionLabel.style.display = "none";
      overlay.translationDefinition.style.display = "none";
      overlay.translationDefinition.textContent = "";
      overlay.translationStatus.textContent = "";
    }
    overlay.definition.textContent = includeRetryHint ? `${trimmed} Press the shortcut again to retry.` : trimmed;
    return;
  }

  overlay.translation.hidden = false;
  overlay.translationTitle.textContent = "English definition";

  const englishDefinitionText = normalizeEnglishDefinition(overlay.translationWord.textContent);
  overlay.translationWordLabel.textContent = "Definition (EN)";
  overlay.translationWord.textContent = englishDefinitionText;

  const errorText = includeRetryHint ? `${trimmed} Press the shortcut again to retry.` : trimmed;
  if (!options.preserveDefinitionArea) {
    overlay.definition.textContent = errorText;
  }
  overlay.translationDefinitionLabel.style.display = "none";
  overlay.translationDefinition.style.display = "none";
  overlay.translationDefinition.textContent = "";
  overlay.translationStatus.textContent = options.preserveDefinitionArea ? errorText : "";
};

export const showGeneratedDefinitionResult = (
  result: {
    definitionSourceLang: WordLanguage;
    definitionEn: string | null;
    definitionZh: string | null;
    definitionJa: string | null;
    definitionSource: import("../shared/messages").DefinitionSource;
  },
  options: { showDefinitionTranslation?: boolean } = {}
) => {
  const overlay = getExistingOverlay();
  if (!overlay) {
    return;
  }

  overlay.translation.hidden = false;

  const sourceDefinition =
    result.definitionSourceLang === "en"
      ? normalizeEnglishDefinition(result.definitionEn)
      : result.definitionSourceLang === "zh" && typeof result.definitionZh === "string" && result.definitionZh.trim()
        ? result.definitionZh.trim()
        : result.definitionSourceLang === "ja" && typeof result.definitionJa === "string" && result.definitionJa.trim()
          ? result.definitionJa.trim()
          : "Definition unavailable.";

  overlay.translationWord.textContent = sourceDefinition;

  const showDefinitionTranslation = options.showDefinitionTranslation !== false;
  if (!showDefinitionTranslation) {
    setDefinitionLabels(overlay, result.definitionSourceLang);
    overlay.translationDefinitionLabel.style.display = "none";
    overlay.translationDefinition.style.display = "none";
    overlay.translationDefinition.textContent = "";
    overlay.translationStatus.textContent = "";
    return;
  }

  // Find the translated definition (the one that's not the source language) and determine target language
  let translatedDefinition: string | null = null;
  let targetLang: TranslationTargetLang | undefined = undefined;

  if (result.definitionSourceLang === "en") {
    // Source is English, prefer Japanese over Chinese if both exist
    if (typeof result.definitionJa === "string" && result.definitionJa.trim()) {
      translatedDefinition = result.definitionJa.trim();
      targetLang = "ja";
    } else if (typeof result.definitionZh === "string" && result.definitionZh.trim()) {
      translatedDefinition = result.definitionZh.trim();
      targetLang = "zh";
    }
  } else if (result.definitionSourceLang === "zh") {
    // Source is Chinese, prefer Japanese over English if both exist
    if (typeof result.definitionJa === "string" && result.definitionJa.trim()) {
      translatedDefinition = result.definitionJa.trim();
      targetLang = "ja";
    } else if (typeof result.definitionEn === "string" && result.definitionEn.trim()) {
      translatedDefinition = result.definitionEn.trim();
      targetLang = "en";
    }
  } else if (result.definitionSourceLang === "ja") {
    // Source is Japanese, prefer English over Chinese if both exist
    if (typeof result.definitionEn === "string" && result.definitionEn.trim()) {
      translatedDefinition = result.definitionEn.trim();
      targetLang = "en";
    } else if (typeof result.definitionZh === "string" && result.definitionZh.trim()) {
      translatedDefinition = result.definitionZh.trim();
      targetLang = "zh";
    }
  }

  setDefinitionLabels(overlay, result.definitionSourceLang, targetLang);

  if (typeof translatedDefinition === "string" && translatedDefinition.trim()) {
    overlay.translationDefinitionLabel.style.display = "block";
    overlay.translationDefinition.style.display = "block";
    overlay.translationDefinition.textContent = translatedDefinition.trim();
    overlay.translationStatus.textContent = "";
  } else {
    overlay.translationDefinitionLabel.style.display = "none";
    overlay.translationDefinition.style.display = "none";
    overlay.translationDefinition.textContent = "";
    overlay.translationStatus.textContent = "Translation unavailable. Press the shortcut again to retry.";
  }
};

export const showGeneratedDefinitionError = (message: string, sourceLang: WordLanguage = "en") => {
  const overlay = getExistingOverlay();
  if (!overlay) {
    return;
  }

  overlay.translation.hidden = false;
  setDefinitionLabels(overlay, sourceLang);
  overlay.translationWord.textContent = "Definition unavailable.";
  overlay.translationDefinitionLabel.style.display = "none";
  overlay.translationDefinition.style.display = "none";
  overlay.translationDefinition.textContent = "";

  const trimmed = message.trim();
  const includeRetryHint =
    !/not configured/i.test(trimmed) && !/disabled/i.test(trimmed) && !/shortcut again to retry/i.test(trimmed);
  overlay.translationStatus.textContent = includeRetryHint ? `${trimmed} Press the shortcut again to retry.` : trimmed;
};

const getOverlay = (): OverlayElements => getExistingOverlay() ?? (cachedOverlay = createOverlay());

export const setOverlayHideListener = (listener: (() => void) | null) => {
  overlayHideListener = listener;
};

export const hideLookupOverlay = () => {
  const overlay = getExistingOverlay();
  if (!overlay) {
    return;
  }
  overlay.root.hidden = true;
  overlayHideListener?.();
};

export const isOverlayOpen = () => {
  const overlay = getExistingOverlay();
  return overlay ? !overlay.root.hidden : false;
};

export const overlayContainsTarget = (target: EventTarget | null) => {
  const overlay = getExistingOverlay();
  if (!overlay || !target) {
    return false;
  }
  return overlay.root.contains(target as Node);
};

export const showLookupOverlay = (
  content: OverlayContent & { sourceLang?: WordLanguage; saveEnabled?: boolean; highlightEnabled?: boolean }
) => {
  ensureStyles();
  ensurePointerTracking();
  bumpAutoCloseIgnore(250);
  const overlay = getOverlay();
  const sourceLang = content.sourceLang ?? "en";

  // Store current word
  // Initialize toggle states from global settings (or use provided values)
  currentWordSaveEnabled = content.saveEnabled ?? true;
  currentWordHighlightEnabled = content.highlightEnabled ?? true;
  updateToggleButtonState(overlay.saveToggle, currentWordSaveEnabled);
  updateToggleButtonState(overlay.highlightToggle, currentWordHighlightEnabled);

  overlay.word.textContent = content.word;
  const suppressFallback = content.suppressFallback === true;
  const trimmedDefinition =
    typeof content.definition === "string" && content.definition.trim() ? content.definition.trim() : "";
  if (suppressFallback && !trimmedDefinition) {
    overlay.definition.textContent = "";
  } else {
    overlay.definition.textContent =
      content.definition ?? (sourceLang === "zh" ? "Translation unavailable." : "Definition unavailable.");
  }
  overlay.status.textContent = content.status ?? "";
  overlay.pronounce.disabled = !content.pronunciationAvailable;
  overlay.pronounce.style.display = content.pronunciationAvailable ? "inline-flex" : "none";
  overlay.pronounce.onclick = content.onPronounce ?? null;

  // Handle initial cached translation data
  const hasInitialTranslation = content.initialTranslation || content.initialDefinitionTranslation;
  if (hasInitialTranslation) {
    // Display cached translation data
    overlay.translation.hidden = false;
    setDefinitionLabels(overlay, sourceLang, undefined);

    // The definition area should show the translation result if we have word translation,
    // otherwise show the original definition (same-language definition)
    if (content.initialTranslation) {
      // We have a word translation, show it in the main definition area
      overlay.definition.textContent = content.initialTranslation;
    }

    // translationWord area shows the ORIGINAL definition (source language definition)
    const sourceDefinition = normalizeEnglishDefinition(trimmedDefinition || "");
    if (sourceDefinition && sourceDefinition !== "Definition unavailable.") {
      overlay.translationWord.textContent = sourceDefinition;
      overlay.translationWordLabel.textContent = `Definition (${sourceLang.toUpperCase()})`;
    } else {
      // No source definition available, hide the word definition section
      overlay.translationWord.textContent = "";
      overlay.translationWordLabel.style.display = "none";
    }

    // translationDefinition area shows the TRANSLATION of the definition
    if (content.initialDefinitionTranslation) {
      overlay.translationDefinitionLabel.style.display = "block";
      overlay.translationDefinition.style.display = "block";
      overlay.translationDefinition.textContent = content.initialDefinitionTranslation;
    } else {
      overlay.translationDefinitionLabel.style.display = "none";
      overlay.translationDefinition.style.display = "none";
      overlay.translationDefinition.textContent = "";
    }

    overlay.translationStatus.textContent = "";
  } else {
    overlay.translation.hidden = true;
    overlay.translationTitle.textContent = "English definition";
    overlay.translationWordLabel.textContent = "Definition (EN)";
    overlay.translationWord.textContent = "";
    overlay.translationDefinition.textContent = "";
    overlay.translationStatus.textContent = "";
  }

  overlay.root.hidden = false;
  void positionOverlay(overlay.root, content.anchorRect);
};

export const showNotice = (message: string) => {
  showLookupOverlay({
    word: "Selection",
    definition: message,
    pronunciationAvailable: false,
    status: ""
  });
};

export const captureSelectionRect = (): AnchorRect | null => {
  const selection = window.getSelection();
  const range =
    selection && selection.rangeCount > 0 && !selection.isCollapsed
      ? selection.getRangeAt(0).cloneRange()
      : null;
  if (range) {
    lastSelectionRange = range;
    lastSelectionRangeAt = Date.now();
  }

  const rect = range ? getRangeRect(range) : null;
  if (rect) {
    lastSelectionRect = rect;
    lastSelectionRectAt = Date.now();
    return rect;
  }
  scheduleSelectionRectCapture();
  return null;
};
