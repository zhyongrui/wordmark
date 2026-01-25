import { clearTranslationApiKey, setTranslationApiKey } from "../shared/translation/secrets";
import { updateTranslationSettings, readTranslationSettings } from "../shared/translation/settings";
import { getTranslationAvailability } from "../shared/translation/status";
import {
  clearGeminiConfig,
  getGeminiConfig,
  readGeminiConfig,
  writeGeminiConfig
} from "../shared/translation/gemini";
import { clearDeepSeekConfig, readDeepSeekConfig, writeDeepSeekConfig } from "../shared/translation/deepseek";
import { clearMoonshotConfig, readMoonshotConfig, writeMoonshotConfig } from "../shared/translation/moonshot";
import { clearOpenAIConfig, readOpenAIConfig, writeOpenAIConfig } from "../shared/translation/openai";
import { clearQwenConfig, readQwenConfig, writeQwenConfig } from "../shared/translation/qwen";
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
const modeSingleButton = byId<HTMLButtonElement>("translation-mode-single");
const modeDualButton = byId<HTMLButtonElement>("translation-mode-dual");
const directionSelect = byId<HTMLSelectElement>("translation-direction");
const directionHint = byId<HTMLSpanElement>("translation-direction-hint");
const providerSelect = byId<HTMLSelectElement>("translation-provider");
const apiKeyInput = byId<HTMLInputElement>("translation-api-key");
const saveButton = byId<HTMLButtonElement>("translation-save");
const clearButton = byId<HTMLButtonElement>("translation-clear");
const statusEl = byId<HTMLDivElement>("translation-status");
const shortcutButton = byId<HTMLButtonElement>("shortcut-open");
const geminiSection = byId<HTMLDivElement>("gemini-config");
const geminiEndpointInput = byId<HTMLInputElement>("gemini-endpoint");
const geminiModelInput = byId<HTMLInputElement>("gemini-model");
const geminiSaveButton = byId<HTMLButtonElement>("gemini-save");
const geminiClearButton = byId<HTMLButtonElement>("gemini-clear");
const deepseekSection = byId<HTMLDivElement>("deepseek-config");
const deepseekEndpointInput = byId<HTMLInputElement>("deepseek-endpoint");
const deepseekModelInput = byId<HTMLInputElement>("deepseek-model");
const deepseekSaveButton = byId<HTMLButtonElement>("deepseek-save");
const deepseekClearButton = byId<HTMLButtonElement>("deepseek-clear");
const moonshotSection = byId<HTMLDivElement>("moonshot-config");
const moonshotEndpointInput = byId<HTMLInputElement>("moonshot-endpoint");
const moonshotModelInput = byId<HTMLInputElement>("moonshot-model");
const moonshotSaveButton = byId<HTMLButtonElement>("moonshot-save");
const moonshotClearButton = byId<HTMLButtonElement>("moonshot-clear");
const openaiSection = byId<HTMLDivElement>("openai-config");
const openaiEndpointInput = byId<HTMLInputElement>("openai-endpoint");
const openaiModelInput = byId<HTMLInputElement>("openai-model");
const openaiSaveButton = byId<HTMLButtonElement>("openai-save");
const openaiClearButton = byId<HTMLButtonElement>("openai-clear");
const qwenSection = byId<HTMLDivElement>("qwen-config");
const qwenEndpointInput = byId<HTMLInputElement>("qwen-endpoint");
const qwenModelInput = byId<HTMLInputElement>("qwen-model");
const qwenSaveButton = byId<HTMLButtonElement>("qwen-save");
const qwenClearButton = byId<HTMLButtonElement>("qwen-clear");
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

let currentMode: "single" | "dual" = "single";

const setDirectionOptions = (mode: "single" | "dual", settings: { singleDirection: string; dualPair: string }) => {
  if (!directionSelect) {
    return;
  }
  const options =
    mode === "single"
      ? [
          { value: "EN->ZH", label: "EN→ZH" },
          { value: "ZH->EN", label: "ZH→EN" }
        ]
      : [{ value: "EN<->ZH", label: "EN↔ZH" }];

  directionSelect.textContent = "";
  options.forEach((option) => {
    const el = document.createElement("option");
    el.value = option.value;
    el.textContent = option.label;
    directionSelect.appendChild(el);
  });

  directionSelect.value = mode === "single" ? settings.singleDirection : settings.dualPair;
  if (directionHint) {
    directionHint.hidden = mode !== "dual";
  }
};

const updateModeUi = (mode: "single" | "dual") => {
  if (modeSingleButton) {
    modeSingleButton.setAttribute("aria-pressed", String(mode === "single"));
  }
  if (modeDualButton) {
    modeDualButton.setAttribute("aria-pressed", String(mode === "dual"));
  }
};

const setModeControlsDisabled = (disabled: boolean) => {
  if (modeSingleButton) {
    modeSingleButton.disabled = disabled;
  }
  if (modeDualButton) {
    modeDualButton.disabled = disabled;
  }
  if (directionSelect) {
    directionSelect.disabled = disabled;
  }
};

const updateProviderVisibility = () => {
  if (!providerSelect) {
    return;
  }
  if (geminiSection) {
    geminiSection.hidden = providerSelect.value !== "gemini";
  }
  if (deepseekSection) {
    deepseekSection.hidden = providerSelect.value !== "deepseek";
  }
  if (moonshotSection) {
    moonshotSection.hidden = providerSelect.value !== "moonshot";
  }
  if (openaiSection) {
    openaiSection.hidden = providerSelect.value !== "openai";
  }
  if (qwenSection) {
    qwenSection.hidden = providerSelect.value !== "qwen";
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
  currentMode = settings.mode;
  updateModeUi(settings.mode);
  setDirectionOptions(settings.mode, settings);
  setModeControlsDisabled(!settings.enabled);
  updateProviderVisibility();

  if (geminiEndpointInput && geminiModelInput) {
    const geminiConfig = await readGeminiConfig();
    geminiEndpointInput.value = geminiConfig.endpointUrl;
    geminiModelInput.value = geminiConfig.modelId;
  }
  if (deepseekEndpointInput && deepseekModelInput) {
    const deepseekConfig = await readDeepSeekConfig();
    deepseekEndpointInput.value = deepseekConfig.endpointUrl;
    deepseekModelInput.value = deepseekConfig.modelId;
  }
  if (moonshotEndpointInput && moonshotModelInput) {
    const moonshotConfig = await readMoonshotConfig();
    moonshotEndpointInput.value = moonshotConfig.endpointUrl;
    moonshotModelInput.value = moonshotConfig.modelId;
  }
  if (openaiEndpointInput && openaiModelInput) {
    const openaiConfig = await readOpenAIConfig();
    openaiEndpointInput.value = openaiConfig.endpointUrl;
    openaiModelInput.value = openaiConfig.modelId;
  }
  if (qwenEndpointInput && qwenModelInput) {
    const qwenConfig = await readQwenConfig();
    qwenEndpointInput.value = qwenConfig.endpointUrl;
    qwenModelInput.value = qwenConfig.modelId;
  }
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
    settings.providerId === "deepseek"
      ? "DeepSeek"
      : settings.providerId === "moonshot"
        ? "Moonshot"
        : settings.providerId === "openai"
          ? "OpenAI"
          : settings.providerId === "qwen"
            ? "Qwen"
            : settings.providerId === "volcengine"
              ? "Volcengine"
              : settings.providerId === "zhipu"
                ? "Zhipu"
                : "Gemini";
  let overrideStatus = "";
  if (settings.providerId === "gemini") {
    const geminiConfig = await getGeminiConfig();
    const overrideActive = geminiConfig != null;
    overrideStatus = ` • Gemini override: <strong class="${overrideActive ? "status-on" : "status-off"}">${
      overrideActive ? "active" : "inactive"
    }</strong>`;
  }

  setStatus(
    `Translation: <strong class="${availability.enabled ? "status-on" : "status-off"}">${
      availability.enabled ? "ON" : "OFF"
    }</strong> • Provider: <strong>${providerLabel}</strong> • Config: <strong class="${
      availability.configured ? "status-on" : "status-off"
    }">${availability.configured ? "configured" : "not configured"}</strong>${overrideStatus}`
  );
};

const initialize = () => {
  if (
    !enabledCheckbox ||
    !modeSingleButton ||
    !modeDualButton ||
    !directionSelect ||
    !directionHint ||
    !providerSelect ||
    !apiKeyInput ||
    !saveButton ||
    !clearButton ||
    !geminiEndpointInput ||
    !geminiModelInput ||
    !geminiSaveButton ||
    !geminiClearButton ||
    !deepseekEndpointInput ||
    !deepseekModelInput ||
    !deepseekSaveButton ||
    !deepseekClearButton ||
    !moonshotEndpointInput ||
    !moonshotModelInput ||
    !moonshotSaveButton ||
    !moonshotClearButton ||
    !openaiEndpointInput ||
    !openaiModelInput ||
    !openaiSaveButton ||
    !openaiClearButton ||
    !qwenEndpointInput ||
    !qwenModelInput ||
    !qwenSaveButton ||
    !qwenClearButton ||
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

  modeSingleButton.addEventListener("click", () => {
    void (async () => {
      await updateTranslationSettings({ mode: "single" });
      await refresh();
    })();
  });

  modeDualButton.addEventListener("click", () => {
    void (async () => {
      await updateTranslationSettings({ mode: "dual" });
      await refresh();
    })();
  });

  directionSelect.addEventListener("change", () => {
    void (async () => {
      if (currentMode === "dual") {
        await updateTranslationSettings({ dualPair: directionSelect.value });
      } else {
        await updateTranslationSettings({ singleDirection: directionSelect.value });
      }
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
      await clearTranslationApiKey(providerSelect.value);
      apiKeyInput.value = "";
      await refresh();
    })();
  });

  geminiSaveButton.addEventListener("click", () => {
    void (async () => {
      const endpointUrl = geminiEndpointInput.value.trim();
      const modelId = geminiModelInput.value.trim();
      if (!endpointUrl || !modelId) {
        setStatus("Enter a Gemini base endpoint URL and model ID first.");
        return;
      }

      await writeGeminiConfig({ endpointUrl, modelId });
      await refresh();
    })();
  });

  geminiClearButton.addEventListener("click", () => {
    void (async () => {
      await clearGeminiConfig();
      geminiEndpointInput.value = "";
      geminiModelInput.value = "";
      await refresh();
    })();
  });

  deepseekSaveButton.addEventListener("click", () => {
    void (async () => {
      const endpointUrl = deepseekEndpointInput.value.trim();
      const modelId = deepseekModelInput.value.trim();
      if (!endpointUrl || !modelId) {
        setStatus("Enter a DeepSeek endpoint URL and model ID first.");
        return;
      }

      await writeDeepSeekConfig({ endpointUrl, modelId });
      await refresh();
    })();
  });

  deepseekClearButton.addEventListener("click", () => {
    void (async () => {
      await clearDeepSeekConfig();
      deepseekEndpointInput.value = "";
      deepseekModelInput.value = "";
      await refresh();
    })();
  });

  moonshotSaveButton.addEventListener("click", () => {
    void (async () => {
      const endpointUrl = moonshotEndpointInput.value.trim();
      const modelId = moonshotModelInput.value.trim();
      if (!endpointUrl || !modelId) {
        setStatus("Enter a Moonshot endpoint URL and model ID first.");
        return;
      }

      await writeMoonshotConfig({ endpointUrl, modelId });
      await refresh();
    })();
  });

  moonshotClearButton.addEventListener("click", () => {
    void (async () => {
      await clearMoonshotConfig();
      moonshotEndpointInput.value = "";
      moonshotModelInput.value = "";
      await refresh();
    })();
  });

  openaiSaveButton.addEventListener("click", () => {
    void (async () => {
      const endpointUrl = openaiEndpointInput.value.trim();
      const modelId = openaiModelInput.value.trim();
      if (!endpointUrl || !modelId) {
        setStatus("Enter an OpenAI endpoint URL and model ID first.");
        return;
      }

      await writeOpenAIConfig({ endpointUrl, modelId });
      await refresh();
    })();
  });

  openaiClearButton.addEventListener("click", () => {
    void (async () => {
      await clearOpenAIConfig();
      openaiEndpointInput.value = "";
      openaiModelInput.value = "";
      await refresh();
    })();
  });

  qwenSaveButton.addEventListener("click", () => {
    void (async () => {
      const endpointUrl = qwenEndpointInput.value.trim();
      const modelId = qwenModelInput.value.trim();
      if (!endpointUrl || !modelId) {
        setStatus("Enter a Qwen endpoint URL and model ID first.");
        return;
      }

      await writeQwenConfig({ endpointUrl, modelId });
      await refresh();
    })();
  });

  qwenClearButton.addEventListener("click", () => {
    void (async () => {
      await clearQwenConfig();
      qwenEndpointInput.value = "";
      qwenModelInput.value = "";
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
