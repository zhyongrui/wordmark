import { clearTranslationApiKey, setTranslationApiKey } from "../shared/translation/secrets";
import { updateTranslationSettings, readTranslationSettings } from "../shared/translation/settings";
import { getTranslationAvailability } from "../shared/translation/status";
import {
  clearVolcengineConfig,
  readVolcengineConfig,
  writeVolcengineConfig
} from "../shared/translation/volcengine";
import { clearZhipuConfig, readZhipuConfig, writeZhipuConfig } from "../shared/translation/zhipu";

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
const volcengineSection = byId<HTMLDivElement>("volcengine-config");
const volcengineEndpointInput = byId<HTMLInputElement>("volcengine-endpoint");
const volcengineModelInput = byId<HTMLInputElement>("volcengine-model");
const volcengineSaveButton = byId<HTMLButtonElement>("volcengine-save");
const volcengineClearButton = byId<HTMLButtonElement>("volcengine-clear");
const zhipuSection = byId<HTMLDivElement>("zhipu-config");
const zhipuEndpointInput = byId<HTMLInputElement>("zhipu-endpoint");
const zhipuModelInput = byId<HTMLInputElement>("zhipu-model");
const zhipuSaveButton = byId<HTMLButtonElement>("zhipu-save");
const zhipuClearButton = byId<HTMLButtonElement>("zhipu-clear");

const setStatus = (message: string) => {
  if (!statusEl) {
    return;
  }
  statusEl.innerHTML = message;
};

const updateProviderVisibility = () => {
  if (!providerSelect) {
    return;
  }
  if (volcengineSection) {
    volcengineSection.hidden = providerSelect.value !== "volcengine";
  }
  if (zhipuSection) {
    zhipuSection.hidden = providerSelect.value !== "zhipu";
  }
};

const refresh = async () => {
  if (!enabledCheckbox || !providerSelect) {
    return;
  }

  const settings = await readTranslationSettings();
  enabledCheckbox.checked = settings.enabled;
  providerSelect.value = settings.providerId || "gemini";
  updateProviderVisibility();

  if (volcengineEndpointInput && volcengineModelInput) {
    const volcengineConfig = await readVolcengineConfig();
    volcengineEndpointInput.value = volcengineConfig.endpointUrl;
    volcengineModelInput.value = volcengineConfig.modelId;
  }
  if (zhipuEndpointInput && zhipuModelInput) {
    const zhipuConfig = await readZhipuConfig();
    zhipuEndpointInput.value = zhipuConfig.endpointUrl;
    zhipuModelInput.value = zhipuConfig.modelId;
  }

  const availability = await getTranslationAvailability();
  const providerLabel =
    settings.providerId === "volcengine"
      ? "Volcengine"
      : settings.providerId === "zhipu"
        ? "Zhipu"
        : "Gemini";
  setStatus(
    `Translation: <strong class="${availability.enabled ? "status-on" : "status-off"}">${
      availability.enabled ? "ON" : "OFF"
    }</strong> • Provider: <strong>${providerLabel}</strong> • Config: <strong class="${
      availability.configured ? "status-on" : "status-off"
    }">${availability.configured ? "configured" : "not configured"}</strong>`
  );
};

const initialize = () => {
  if (
    !enabledCheckbox ||
    !providerSelect ||
    !apiKeyInput ||
    !saveButton ||
    !clearButton ||
    !volcengineEndpointInput ||
    !volcengineModelInput ||
    !volcengineSaveButton ||
    !volcengineClearButton ||
    !zhipuEndpointInput ||
    !zhipuModelInput ||
    !zhipuSaveButton ||
    !zhipuClearButton
  ) {
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
      updateProviderVisibility();
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

  volcengineSaveButton.addEventListener("click", () => {
    void (async () => {
      const endpointUrl = volcengineEndpointInput.value.trim();
      const modelId = volcengineModelInput.value.trim();
      if (!endpointUrl || !modelId) {
        setStatus("Enter a Volcengine endpoint URL and model/endpoint ID first.");
        return;
      }

      await writeVolcengineConfig({ endpointUrl, modelId });
      await refresh();
    })();
  });

  volcengineClearButton.addEventListener("click", () => {
    void (async () => {
      await clearVolcengineConfig();
      volcengineEndpointInput.value = "";
      volcengineModelInput.value = "";
      await refresh();
    })();
  });

  zhipuSaveButton.addEventListener("click", () => {
    void (async () => {
      const endpointUrl = zhipuEndpointInput.value.trim();
      const modelId = zhipuModelInput.value.trim();
      if (!endpointUrl || !modelId) {
        setStatus("Enter a Zhipu endpoint URL and model ID first.");
        return;
      }

      await writeZhipuConfig({ endpointUrl, modelId });
      await refresh();
    })();
  });

  zhipuClearButton.addEventListener("click", () => {
    void (async () => {
      await clearZhipuConfig();
      zhipuEndpointInput.value = "";
      zhipuModelInput.value = "";
      await refresh();
    })();
  });

  void refresh();
};

initialize();
