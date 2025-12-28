import { clearTranslationApiKey, setTranslationApiKey } from "../shared/translation/secrets";
import { updateTranslationSettings, readTranslationSettings } from "../shared/translation/settings";
import { getTranslationAvailability } from "../shared/translation/status";

const byId = <T extends HTMLElement>(id: string): T | null => {
  return document.getElementById(id) as T | null;
};

const enabledCheckbox = byId<HTMLInputElement>("translation-enabled");
const providerSelect = byId<HTMLSelectElement>("translation-provider");
const apiKeyInput = byId<HTMLInputElement>("translation-api-key");
const saveButton = byId<HTMLButtonElement>("translation-save");
const clearButton = byId<HTMLButtonElement>("translation-clear");
const statusEl = byId<HTMLDivElement>("translation-status");
const shortcutButton = byId<HTMLButtonElement>("shortcut-open");

const setStatus = (message: string) => {
  if (!statusEl) {
    return;
  }
  statusEl.innerHTML = message;
};

const refresh = async () => {
  if (!enabledCheckbox || !providerSelect) {
    return;
  }

  const settings = await readTranslationSettings();
  enabledCheckbox.checked = settings.enabled;
  providerSelect.value = settings.providerId || "gemini";

  const availability = await getTranslationAvailability();
  setStatus(
    `Translation: <strong class="${availability.enabled ? "status-on" : "status-off"}">${
      availability.enabled ? "ON" : "OFF"
    }</strong> • API key: <strong class="${availability.configured ? "status-on" : "status-off"}">${
      availability.configured ? "configured" : "not configured"
    }</strong>`
  );
};

const initialize = () => {
  if (!enabledCheckbox || !providerSelect || !apiKeyInput || !saveButton || !clearButton) {
    return;
  }

  if (shortcutButton && chrome?.tabs?.create) {
    const openShortcutSettings = async () => {
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const url = ua && ua.includes("Edg/") ? "edge://extensions/shortcuts" : "chrome://extensions/shortcuts";
      try {
        const result = chrome.tabs.create({ url });
        if (result && typeof (result as Promise<chrome.tabs.Tab>).then === "function") {
          await result;
        }
      } catch {
        // ignore failures in options UI
      }
    };
    shortcutButton.addEventListener("click", () => {
      void openShortcutSettings();
    });
  }

  enabledCheckbox.addEventListener("change", () => {
    void (async () => {
      await updateTranslationSettings({ enabled: enabledCheckbox.checked });
      await refresh();
    })();
  });

  providerSelect.addEventListener("change", () => {
    void (async () => {
      await updateTranslationSettings({ providerId: providerSelect.value });
      await refresh();
    })();
  });

  saveButton.addEventListener("click", () => {
    void (async () => {
      const apiKey = apiKeyInput.value.trim();
      if (!apiKey) {
        setStatus("Enter an API key first.");
        return;
      }

      await setTranslationApiKey(providerSelect.value, apiKey);
      apiKeyInput.value = "";
      await refresh();
    })();
  });

  clearButton.addEventListener("click", () => {
    void (async () => {
      await clearTranslationApiKey();
      apiKeyInput.value = "";
      await refresh();
    })();
  });

  void refresh();
};

initialize();
