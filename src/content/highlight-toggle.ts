type HighlightToggle = {
  setEnabled: (enabled: boolean) => void;
  getEnabled: () => boolean;
};

type HighlightToggleOptions = {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
};

const TOGGLE_ID = "wordmark-highlight-toggle";
const STYLE_ID = "wordmark-highlight-toggle-style";

const ensureStyles = () => {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${TOGGLE_ID} {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 2147483647;
      border: 1px solid #e0d6c8;
      background: #ffffff;
      color: #2b241d;
      border-radius: 12px;
      padding: 6px 10px;
      font-family: "Times New Roman", Times, serif;
      font-size: 12px;
      letter-spacing: 0.02em;
      cursor: pointer;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
    }

    #${TOGGLE_ID}[data-enabled="false"] {
      opacity: 0.7;
      background: #f7f2e9;
    }
  `;
  document.head.appendChild(style);
};

const getExistingToggle = (): HTMLButtonElement | null => {
  return document.getElementById(TOGGLE_ID) as HTMLButtonElement | null;
};

const createToggle = (options: HighlightToggleOptions): HighlightToggle => {
  ensureStyles();
  const button = document.createElement("button");
  button.id = TOGGLE_ID;
  button.type = "button";
  button.setAttribute("data-wordmark-root", "true");

  let enabled = options.enabled;

  const applyState = (nextEnabled: boolean) => {
    enabled = nextEnabled;
    button.setAttribute("data-enabled", String(nextEnabled));
    button.setAttribute("aria-pressed", String(nextEnabled));
    button.textContent = nextEnabled ? "Highlights: On" : "Highlights: Off";
  };

  applyState(enabled);

  button.addEventListener("click", () => {
    const nextEnabled = !enabled;
    applyState(nextEnabled);
    options.onToggle(nextEnabled);
  });

  document.body.appendChild(button);

  return {
    setEnabled: applyState,
    getEnabled: () => enabled
  };
};

export const ensureHighlightToggle = (options: HighlightToggleOptions): HighlightToggle => {
  const existing = getExistingToggle();
  if (!existing) {
    return createToggle(options);
  }

  let enabled = options.enabled;

  const applyState = (nextEnabled: boolean) => {
    enabled = nextEnabled;
    existing.setAttribute("data-enabled", String(nextEnabled));
    existing.setAttribute("aria-pressed", String(nextEnabled));
    existing.textContent = nextEnabled ? "Highlights: On" : "Highlights: Off";
  };

  existing.setAttribute("data-wordmark-root", "true");
  applyState(options.enabled);

  const handler = () => {
    const nextEnabled = !enabled;
    applyState(nextEnabled);
    options.onToggle(nextEnabled);
  };

  existing.addEventListener("click", handler);

  return {
    setEnabled: applyState,
    getEnabled: () => enabled
  };
};

export type { HighlightToggle };
