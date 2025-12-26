type OverlayContent = {
  word: string;
  definition: string | null;
  pronunciationAvailable: boolean;
  status?: string;
  onPronounce?: () => void;
  anchorRect?: AnchorRect | null;
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

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const bumpAutoCloseIgnore = (ms = 200) => {
  ignoreAutoCloseUntil = Date.now() + ms;
};

export const shouldIgnoreAutoClose = () => Date.now() < ignoreAutoCloseUntil;

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

  const close = document.createElement("button");
  close.className = "wordmark-close";
  close.type = "button";
  close.textContent = "×";
  close.addEventListener("click", () => {
    hideLookupOverlay();
  });

  header.appendChild(title);
  header.appendChild(close);

  const word = document.createElement("div");
  word.className = "wordmark-word";

  const definition = document.createElement("div");
  definition.className = "wordmark-definition";

  const actions = document.createElement("div");
  actions.className = "wordmark-actions";

  const pronounce = document.createElement("button");
  pronounce.className = "wordmark-button";
  pronounce.type = "button";
  pronounce.textContent = "Play pronunciation";

  actions.appendChild(pronounce);

  const status = document.createElement("div");
  status.className = "wordmark-status";

  root.appendChild(header);
  root.appendChild(word);
  root.appendChild(definition);
  root.appendChild(actions);
  root.appendChild(status);

  (document.documentElement ?? document.body).appendChild(root);

  return { root, word, definition, pronounce, status };
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

  const buttons = existing.querySelectorAll<HTMLButtonElement>(".wordmark-button");
  const pronounce = buttons[0] ?? (existing.querySelector(".wordmark-button") as HTMLButtonElement);
  if (buttons.length > 1) {
    buttons.forEach((button, index) => {
      if (index > 0) {
        button.remove();
      }
    });
  }

  cachedOverlay = {
    root: existing,
    word: existing.querySelector(".wordmark-word") as HTMLDivElement,
    definition: existing.querySelector(".wordmark-definition") as HTMLDivElement,
    pronounce,
    status: existing.querySelector(".wordmark-status") as HTMLDivElement
  };
  return cachedOverlay;
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

export const showLookupOverlay = (content: OverlayContent) => {
  ensureStyles();
  ensurePointerTracking();
  bumpAutoCloseIgnore(250);
  const overlay = getOverlay();
  overlay.word.textContent = content.word;
  overlay.definition.textContent = content.definition ?? "Definition unavailable.";
  overlay.status.textContent = content.status ?? "";
  overlay.pronounce.disabled = !content.pronunciationAvailable;
  overlay.pronounce.style.display = content.pronunciationAvailable ? "inline-flex" : "none";
  overlay.pronounce.onclick = content.onPronounce ?? null;
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
