type HighlightEngine = {
  setWords: (words: string[]) => void;
  setEnabled: (enabled: boolean) => void;
  removeWord: (word: string) => void;
  refresh: () => void;
};

const HIGHLIGHT_CLASS = "wordmark-highlight";
const HIGHLIGHT_WORD_ATTR = "data-wordmark-word";
const ROOT_ATTR = "data-wordmark-root";
const STYLE_ID = "wordmark-highlight-style";
const WORD_PATTERN = /[A-Za-z]+(?:['-][A-Za-z]+)*/g;
const IGNORED_TAGS = new Set([
  "input",
  "textarea",
  "script",
  "style",
  "noscript"
]);

// Performance tuning knobs (T041)
const FRAME_TIME_BUDGET_MS = 8;
const HIGHLIGHT_BATCH_SIZE = 80;

// Full-scan safety limits: if exceeded, we stop the full scan and switch to "incremental-only".
// These thresholds should be high enough for typical pages while protecting very large documents.
const FULL_SCAN_MAX_CANDIDATE_TEXT_NODES = 20000;
const FULL_SCAN_MAX_MATCHED_CHARACTERS = 1_500_000;
const FULL_SCAN_MAX_WORK_MS = 1500;

const PERF_LOG_PREFIX = "[WordMark][highlight]";

const ensureStyles = () => {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      background: rgba(255, 230, 150, 0.55);
      border-bottom: 1px solid rgba(160, 140, 90, 0.6);
      border-radius: 2px;
      padding: 0 1px;
    }
  `;
  document.head.appendChild(style);
};

const isIgnoredElement = (element: Element | null): boolean => {
  let current: Element | null = element;
  while (current) {
    if (current.hasAttribute(ROOT_ATTR)) {
      return true;
    }
    if (current.classList.contains(HIGHLIGHT_CLASS)) {
      return true;
    }
    const tagName = current.tagName.toLowerCase();
    if (IGNORED_TAGS.has(tagName)) {
      return true;
    }
    if (current instanceof HTMLElement && current.isContentEditable) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
};

const shouldProcessTextNode = (node: Text): boolean => {
  if (!node.nodeValue || !/[A-Za-z]/.test(node.nodeValue)) {
    return false;
  }
  const parent = node.parentElement;
  if (!parent || isIgnoredElement(parent)) {
    return false;
  }
  return true;
};

const highlightTextNode = (node: Text, words: Set<string>): void => {
  const text = node.nodeValue;
  if (!text) {
    return;
  }

  WORD_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  let hasHighlights = false;
  const fragment = document.createDocumentFragment();

  while ((match = WORD_PATTERN.exec(text)) !== null) {
    const matchText = match[0];
    const start = match.index;
    const end = start + matchText.length;
    if (start > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, start)));
    }

    const normalized = matchText.toLowerCase();
    if (words.has(normalized)) {
      hasHighlights = true;
      const mark = document.createElement("span");
      mark.className = HIGHLIGHT_CLASS;
      mark.setAttribute(HIGHLIGHT_WORD_ATTR, normalized);
      mark.textContent = matchText;
      fragment.appendChild(mark);
    } else {
      fragment.appendChild(document.createTextNode(matchText));
    }

    lastIndex = end;
  }

  if (!hasHighlights) {
    return;
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  node.replaceWith(fragment);
};

const unwrapHighlight = (element: HTMLElement) => {
  const text = document.createTextNode(element.textContent ?? "");
  element.replaceWith(text);
  text.parentNode?.normalize();
};

const removeHighlightsByWord = (word: string) => {
  const highlights = document.querySelectorAll<HTMLElement>(
    `.${HIGHLIGHT_CLASS}[${HIGHLIGHT_WORD_ATTR}="${word}"]`
  );
  highlights.forEach(unwrapHighlight);
};

const clearAllHighlights = () => {
  const highlights = document.querySelectorAll<HTMLElement>(`.${HIGHLIGHT_CLASS}`);
  highlights.forEach(unwrapHighlight);
};

export const createHighlightEngine = (): HighlightEngine => {
  let enabled = true;
  let words = new Set<string>();
  let pendingTextNodes: Text[] = [];
  let scanScheduled = false;
  let scanToken = 0;
  let observer: MutationObserver | null = null;
  type WalkerState = { walker: TreeWalker; held: Text | null };
  let incrementalWalkers: WalkerState[] = [];

  let fullScanWalker: TreeWalker | null = null;
  let fullScanHeldNode: Text | null = null;
  let fullScanCandidateTextNodes = 0;
  let fullScanMatchedCharacters = 0;
  let fullScanWorkMs = 0;
  let fullScanDegraded = false;
  let fullScanDegradeLogged = false;

  const scheduleScan = () => {
    if (scanScheduled) {
      return;
    }
    scanScheduled = true;
    requestAnimationFrame(() => {
      scanScheduled = false;
      processWork(scanToken);
    });
  };

  const createIncrementalWalker = (root: Node): TreeWalker =>
    document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (currentNode) =>
        shouldProcessTextNode(currentNode as Text)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT
    });

  const createFullScanWalker = (root: Node): TreeWalker =>
    document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (currentNode) =>
        shouldProcessTextNode(currentNode as Text)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT
    });

  const logDegradeOnce = (reason: string) => {
    if (fullScanDegradeLogged) {
      return;
    }
    fullScanDegradeLogged = true;
    console.warn(`${PERF_LOG_PREFIX} entering degraded mode (incremental-only)`, {
      reason,
      thresholds: {
        maxCandidateTextNodes: FULL_SCAN_MAX_CANDIDATE_TEXT_NODES,
        maxMatchedCharacters: FULL_SCAN_MAX_MATCHED_CHARACTERS,
        maxWorkMs: FULL_SCAN_MAX_WORK_MS
      },
      observed: {
        candidateTextNodes: fullScanCandidateTextNodes,
        matchedCharacters: fullScanMatchedCharacters,
        workMs: Math.round(fullScanWorkMs)
      }
    });
  };

  const degradeFullScan = (reason: string) => {
    fullScanWalker = null;
    fullScanDegraded = true;
    logDegradeOnce(reason);
  };

  const enqueueTextNode = (node: Text) => {
    if (!shouldProcessTextNode(node)) {
      return;
    }
    pendingTextNodes.push(node);
  };

  const enqueueFromNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      enqueueTextNode(node as Text);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node as Element;
    if (isIgnoredElement(element)) {
      return;
    }

    incrementalWalkers.push({ walker: createIncrementalWalker(element), held: null });
    scheduleScan();
  };

  const startFullScan = () => {
    if (!document.body) {
      return;
    }

    scanToken += 1;
    pendingTextNodes = [];
    incrementalWalkers = [];
    fullScanWalker = null;
    fullScanHeldNode = null;

    fullScanCandidateTextNodes = 0;
    fullScanMatchedCharacters = 0;
    fullScanWorkMs = 0;

    if (fullScanDegraded) {
      return;
    }

    fullScanWalker = createFullScanWalker(document.body);
    scheduleScan();
  };

  const pumpIncrementalWalker = (): boolean => {
    while (incrementalWalkers.length > 0) {
      const state = incrementalWalkers[incrementalWalkers.length - 1];
      const nextNode = state.walker.nextNode() as Text | null;
      if (!nextNode) {
        if (state.held) {
          pendingTextNodes.push(state.held);
          state.held = null;
        }
        incrementalWalkers.pop();
        continue;
      }

      if (state.held) {
        pendingTextNodes.push(state.held);
      }
      state.held = nextNode;
      return true;
    }
    return false;
  };

  const pumpFullScanWalker = (): boolean => {
    if (fullScanDegraded || !fullScanWalker) {
      return false;
    }

    const stepStart = performance.now();
    const nextNode = fullScanWalker.nextNode() as Text | null;
    fullScanWorkMs += performance.now() - stepStart;

    if (!nextNode) {
      if (fullScanHeldNode) {
        pendingTextNodes.push(fullScanHeldNode);
        fullScanHeldNode = null;
      }
      fullScanWalker = null;
      return false;
    }

    fullScanCandidateTextNodes += 1;
    fullScanMatchedCharacters += nextNode.data.length;

    if (fullScanHeldNode) {
      pendingTextNodes.push(fullScanHeldNode);
    }
    fullScanHeldNode = nextNode;

    if (fullScanCandidateTextNodes > FULL_SCAN_MAX_CANDIDATE_TEXT_NODES) {
      if (fullScanHeldNode) {
        pendingTextNodes.push(fullScanHeldNode);
        fullScanHeldNode = null;
      }
      degradeFullScan("candidateTextNodes-exceeded");
      return true;
    }

    if (fullScanMatchedCharacters > FULL_SCAN_MAX_MATCHED_CHARACTERS) {
      if (fullScanHeldNode) {
        pendingTextNodes.push(fullScanHeldNode);
        fullScanHeldNode = null;
      }
      degradeFullScan("matchedCharacters-exceeded");
      return true;
    }

    if (fullScanWorkMs > FULL_SCAN_MAX_WORK_MS) {
      if (fullScanHeldNode) {
        pendingTextNodes.push(fullScanHeldNode);
        fullScanHeldNode = null;
      }
      degradeFullScan("workMs-exceeded");
      return true;
    }

    return true;
  };

  const processWork = (token: number) => {
    if (token !== scanToken) {
      return;
    }
    if (!enabled || words.size === 0) {
      pendingTextNodes = [];
      incrementalWalkers = [];
      fullScanWalker = null;
      fullScanHeldNode = null;
      return;
    }

    const frameStart = performance.now();
    let processed = 0;

    while (
      processed < HIGHLIGHT_BATCH_SIZE &&
      performance.now() - frameStart < FRAME_TIME_BUDGET_MS
    ) {
      const node = pendingTextNodes.pop();
      if (node) {
        if (node.isConnected) {
          highlightTextNode(node, words);
        }
        processed += 1;
        continue;
      }

      if (pumpIncrementalWalker()) {
        continue;
      }

      if (pumpFullScanWalker()) {
        continue;
      }

      break;
    }

    if (pendingTextNodes.length > 0 || incrementalWalkers.length > 0 || fullScanWalker) {
      scheduleScan();
    }
  };

  const ensureObserver = () => {
    if (observer || !document.body) {
      return;
    }
    observer = new MutationObserver((mutations) => {
      if (!enabled || words.size === 0) {
        return;
      }

      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          enqueueFromNode(mutation.target);
        } else if (mutation.type === "childList") {
          mutation.addedNodes.forEach(enqueueFromNode);
        }
      }

      scheduleScan();
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true
    });
  };

  const disconnectObserver = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

  const setEnabled = (nextEnabled: boolean) => {
    if (enabled === nextEnabled) {
      return;
    }
    enabled = nextEnabled;

    if (!enabled) {
      disconnectObserver();
      clearAllHighlights();
      pendingTextNodes = [];
      incrementalWalkers = [];
      fullScanWalker = null;
      return;
    }

    ensureStyles();
    startFullScan();
    ensureObserver();
  };

  const setWords = (nextWords: string[]) => {
    const nextSet = new Set(nextWords.map((word) => word.toLowerCase()));
    const removed = Array.from(words).filter((word) => !nextSet.has(word));
    const added = Array.from(nextSet).filter((word) => !words.has(word));
    words = nextSet;

    removed.forEach(removeHighlightsByWord);

    if (!enabled) {
      return;
    }

    if (words.size === 0) {
      clearAllHighlights();
      return;
    }

    if (added.length > 0) {
      ensureStyles();
      startFullScan();
      ensureObserver();
    }
  };

  const removeWord = (word: string) => {
    if (!words.has(word)) {
      return;
    }
    words.delete(word);
    removeHighlightsByWord(word);
  };

  const refresh = () => {
    if (!enabled) {
      return;
    }
    if (words.size === 0) {
      clearAllHighlights();
      return;
    }
    ensureStyles();
    startFullScan();
    ensureObserver();
  };

  return {
    setWords,
    setEnabled,
    removeWord,
    refresh
  };
};

export type { HighlightEngine };
