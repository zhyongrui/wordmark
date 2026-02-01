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
const saveQueriedWordsCheckbox = byId<HTMLInputElement>("save-queried-words");
const highlightQueriedWordsCheckbox = byId<HTMLInputElement>("highlight-queried-words");
const translationToggle = byId<HTMLDivElement>("translation-toggle");
const definitionBackfillCheckbox = byId<HTMLInputElement>("definition-backfill-enabled");
const definitionTranslationCheckbox = byId<HTMLInputElement>("definition-translation-enabled");
const saveDefinitionBackfillCheckbox = byId<HTMLInputElement>("save-definition-backfill");
const saveDefinitionTranslationCheckbox = byId<HTMLInputElement>("save-definition-translation");
const definitionBackfillToggle = byId<HTMLDivElement>("definition-backfill-toggle");
const definitionTranslationToggle = byId<HTMLDivElement>("definition-translation-toggle");
const modeSingleButton = byId<HTMLButtonElement>("translation-mode-single");
const modeDualButton = byId<HTMLButtonElement>("translation-mode-dual");
const directionSelect = byId<HTMLSelectElement>("translation-direction");
const directionHint = byId<HTMLSpanElement>("translation-direction-hint");
const preferJaHanRow = byId<HTMLElement>("ja-han-pref-row");
const preferJaHanCheckbox = byId<HTMLInputElement>("prefer-ja-han");
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
const geminiNote = byId<HTMLDivElement>("gemini-note");
const deepseekSection = byId<HTMLDivElement>("deepseek-config");
const deepseekEndpointInput = byId<HTMLInputElement>("deepseek-endpoint");
const deepseekModelInput = byId<HTMLInputElement>("deepseek-model");
const deepseekSaveButton = byId<HTMLButtonElement>("deepseek-save");
const deepseekClearButton = byId<HTMLButtonElement>("deepseek-clear");
const deepseekNote = byId<HTMLDivElement>("deepseek-note");
const moonshotSection = byId<HTMLDivElement>("moonshot-config");
const moonshotEndpointInput = byId<HTMLInputElement>("moonshot-endpoint");
const moonshotModelInput = byId<HTMLInputElement>("moonshot-model");
const moonshotSaveButton = byId<HTMLButtonElement>("moonshot-save");
const moonshotClearButton = byId<HTMLButtonElement>("moonshot-clear");
const moonshotNote = byId<HTMLDivElement>("moonshot-note");
const openaiSection = byId<HTMLDivElement>("openai-config");
const openaiEndpointInput = byId<HTMLInputElement>("openai-endpoint");
const openaiModelInput = byId<HTMLInputElement>("openai-model");
const openaiSaveButton = byId<HTMLButtonElement>("openai-save");
const openaiClearButton = byId<HTMLButtonElement>("openai-clear");
const openaiNote = byId<HTMLDivElement>("openai-note");
const qwenSection = byId<HTMLDivElement>("qwen-config");
const qwenEndpointInput = byId<HTMLInputElement>("qwen-endpoint");
const qwenModelInput = byId<HTMLInputElement>("qwen-model");
const qwenSaveButton = byId<HTMLButtonElement>("qwen-save");
const qwenClearButton = byId<HTMLButtonElement>("qwen-clear");
const qwenNote = byId<HTMLDivElement>("qwen-note");
const volcengineSection = byId<HTMLDivElement>("volcengine-config");
const volcengineEndpointInput = byId<HTMLInputElement>("volcengine-endpoint");
const volcengineModelInput = byId<HTMLInputElement>("volcengine-model");
const volcengineSaveButton = byId<HTMLButtonElement>("volcengine-save");
const volcengineClearButton = byId<HTMLButtonElement>("volcengine-clear");
const volcengineNote = byId<HTMLDivElement>("volcengine-note");
const zhipuSection = byId<HTMLDivElement>("zhipu-config");
const zhipuEndpointInput = byId<HTMLInputElement>("zhipu-endpoint");
const zhipuModelInput = byId<HTMLInputElement>("zhipu-model");
const zhipuSaveButton = byId<HTMLButtonElement>("zhipu-save");
const zhipuClearButton = byId<HTMLButtonElement>("zhipu-clear");
const zhipuNote = byId<HTMLDivElement>("zhipu-note");
const translationApiNote = byId<HTMLDivElement>("translation-api-note");

const setStatus = (message: string) => {
  if (!statusEl) {
    return;
  }
  statusEl.innerHTML = message;
};

const providerLabels: Record<string, string> = {
  gemini: "Gemini",
  deepseek: "DeepSeek",
  moonshot: "Moonshot",
  openai: "OpenAI",
  qwen: "Qwen",
  volcengine: "Volcengine",
  zhipu: "Zhipu"
};

const getProviderLabel = (providerId: string | null | undefined): string => {
  if (!providerId) {
    return "Gemini";
  }
  return providerLabels[providerId] ?? "Gemini";
};

const noteTimers = new WeakMap<HTMLElement, number>();

const ensureNoteBaseline = (noteEl: HTMLElement) => {
  if (!noteEl.dataset.originalNote) {
    noteEl.dataset.originalNote = noteEl.textContent ?? "";
  }
};


const restoreNote = (noteEl: HTMLElement) => {
  const original = noteEl.dataset.originalNote ?? "";
  noteEl.textContent = original;
};

const showNoteFeedback = (noteEl: HTMLElement | null, message: string, tone: "success" | "error") => {
  if (!noteEl) {
    return;
  }
  ensureNoteBaseline(noteEl);
  noteEl.textContent = "";
  const pill = document.createElement("span");
  pill.className = `note-pill note-${tone}`;
  pill.textContent = message;
  noteEl.appendChild(pill);
  const previousTimer = noteTimers.get(noteEl);
  if (previousTimer) {
    window.clearTimeout(previousTimer);
  }
  const timeoutMs = tone === "success" ? 3000 : 6000;
  const timer = window.setTimeout(() => {
    restoreNote(noteEl);
  }, timeoutMs);
  noteTimers.set(noteEl, timer);
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
          { value: "ZH->EN", label: "ZH→EN" },
          { value: "EN->JA", label: "EN→JA" },
          { value: "JA->EN", label: "JA→EN" },
          { value: "ZH->JA", label: "ZH→JA" },
          { value: "JA->ZH", label: "JA→ZH" }
        ]
      : [
          { value: "EN<->ZH", label: "EN↔ZH" },
          { value: "EN<->JA", label: "EN↔JA" },
          { value: "ZH<->JA", label: "ZH↔JA" }
        ];

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

const updateJaHanPreferenceVisibility = () => {
  if (!preferJaHanRow || !directionSelect) {
    return;
  }
  const value = directionSelect.value;
  const shouldShow = currentMode === "dual" ? value.includes("JA") : value.startsWith("JA->");
  // `hidden` can be overridden by author CSS in some contexts, so also force display.
  preferJaHanRow.hidden = !shouldShow;
  preferJaHanRow.style.display = shouldShow ? "inline-flex" : "none";
};

const setJaHanPreferenceDisabled = (disabled: boolean) => {
  if (preferJaHanCheckbox) {
    preferJaHanCheckbox.disabled = disabled;
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
  setJaHanPreferenceDisabled(disabled);
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

const updateDefinitionTranslationToggleState = (translationEnabled: boolean, backfillEnabled: boolean) => {
  const shouldEnable = translationEnabled && backfillEnabled;
  if (definitionTranslationCheckbox) {
    definitionTranslationCheckbox.disabled = !shouldEnable;
  }
  if (definitionTranslationToggle) {
    definitionTranslationToggle.classList.toggle("is-disabled", !shouldEnable);
  }
};

const updateDefinitionTogglesState = (translationEnabled: boolean) => {
  if (definitionBackfillCheckbox) {
    definitionBackfillCheckbox.disabled = !translationEnabled;
  }
  if (definitionBackfillToggle) {
    definitionBackfillToggle.classList.toggle("is-disabled", !translationEnabled);
  }
};

const updateSaveCheckboxStates = (translationEnabled: boolean, backfillEnabled: boolean, definitionTranslationEnabled: boolean) => {
  if (saveDefinitionBackfillCheckbox) {
    saveDefinitionBackfillCheckbox.disabled = !translationEnabled || !backfillEnabled;
  }
  if (saveDefinitionTranslationCheckbox) {
    saveDefinitionTranslationCheckbox.disabled = !translationEnabled || !backfillEnabled || !definitionTranslationEnabled;
  }
};

const refresh = async () => {
  if (!enabledCheckbox || !providerSelect) {
    return;
  }

  const settings = await readTranslationSettings();
  enabledCheckbox.checked = settings.enabled;
  if (preferJaHanCheckbox) {
    preferJaHanCheckbox.checked = settings.preferJapaneseForHanSelections;
  }
  if (saveQueriedWordsCheckbox) {
    saveQueriedWordsCheckbox.checked = settings.saveQueriedWords;
  }
  if (highlightQueriedWordsCheckbox) {
    highlightQueriedWordsCheckbox.checked = settings.highlightQueriedWords;
  }
  if (definitionBackfillCheckbox) {
    definitionBackfillCheckbox.checked = settings.definitionBackfillEnabled;
  }
  if (definitionTranslationCheckbox) {
    definitionTranslationCheckbox.checked = settings.definitionTranslationEnabled;
  }
  if (saveDefinitionBackfillCheckbox) {
    saveDefinitionBackfillCheckbox.checked = settings.saveDefinitionBackfill;
  }
  if (saveDefinitionTranslationCheckbox) {
    saveDefinitionTranslationCheckbox.checked = settings.saveDefinitionTranslation;
  }
  updateDefinitionTranslationToggleState(settings.enabled, settings.definitionBackfillEnabled);
  updateDefinitionTogglesState(settings.enabled);
  updateSaveCheckboxStates(settings.enabled, settings.definitionBackfillEnabled, settings.definitionTranslationEnabled);
  providerSelect.value = settings.providerId || "gemini";
  currentMode = settings.mode;
  updateModeUi(settings.mode);
  setDirectionOptions(settings.mode, settings);
  updateJaHanPreferenceVisibility();
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
  const providerLabel = getProviderLabel(settings.providerId);
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
    !saveQueriedWordsCheckbox ||
    !highlightQueriedWordsCheckbox ||
    !translationToggle ||
    !definitionBackfillCheckbox ||
    !definitionTranslationCheckbox ||
    !definitionTranslationToggle ||
    !modeSingleButton ||
    !modeDualButton ||
    !directionSelect ||
    !directionHint ||
    !preferJaHanRow ||
    !preferJaHanCheckbox ||
    !providerSelect ||
    !apiKeyInput ||
    !saveButton ||
    !clearButton ||
    !geminiEndpointInput ||
    !geminiModelInput ||
    !geminiSaveButton ||
    !geminiClearButton ||
    !geminiNote ||
    !deepseekEndpointInput ||
    !deepseekModelInput ||
    !deepseekSaveButton ||
    !deepseekClearButton ||
    !deepseekNote ||
    !moonshotEndpointInput ||
    !moonshotModelInput ||
    !moonshotSaveButton ||
    !moonshotClearButton ||
    !moonshotNote ||
    !openaiEndpointInput ||
    !openaiModelInput ||
    !openaiSaveButton ||
    !openaiClearButton ||
    !openaiNote ||
    !qwenEndpointInput ||
    !qwenModelInput ||
    !qwenSaveButton ||
    !qwenClearButton ||
    !qwenNote ||
    !volcengineEndpointInput ||
    !volcengineModelInput ||
    !volcengineSaveButton ||
    !volcengineClearButton ||
    !volcengineNote ||
    !zhipuEndpointInput ||
    !zhipuModelInput ||
    !zhipuSaveButton ||
    !zhipuClearButton ||
    !zhipuNote ||
    !translationApiNote
  ) {
    return;
  }

  // Auto-collapse the 3 toggle sections when the user clicks anywhere else on the page.
  const collapsibleAreas = [translationToggle, definitionBackfillToggle, definitionTranslationToggle].filter(
    (el): el is HTMLElement => Boolean(el)
  );
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      const clickedInside = collapsibleAreas.some((area) => area.contains(target));
      if (clickedInside) {
        return;
      }
      collapsibleAreas.forEach((area) => {
        area.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((details) => {
          details.open = false;
        });
      });
    },
    { capture: true }
  );

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

  if (saveQueriedWordsCheckbox) {
    saveQueriedWordsCheckbox.addEventListener("change", () => {
      void (async () => {
        await updateTranslationSettings({ saveQueriedWords: saveQueriedWordsCheckbox.checked });
      })();
    });
  }

  if (highlightQueriedWordsCheckbox) {
    highlightQueriedWordsCheckbox.addEventListener("change", () => {
      void (async () => {
        await updateTranslationSettings({ highlightQueriedWords: highlightQueriedWordsCheckbox.checked });
      })();
    });
  }

  definitionBackfillCheckbox.addEventListener("change", () => {
    void (async () => {
      await updateTranslationSettings({ definitionBackfillEnabled: definitionBackfillCheckbox.checked });
      await refresh();
    })();
  });

  definitionTranslationCheckbox.addEventListener("change", () => {
    void (async () => {
      await updateTranslationSettings({ definitionTranslationEnabled: definitionTranslationCheckbox.checked });
      await refresh();
    })();
  });

  if (saveDefinitionBackfillCheckbox) {
    saveDefinitionBackfillCheckbox.addEventListener("change", () => {
      void (async () => {
        await updateTranslationSettings({ saveDefinitionBackfill: saveDefinitionBackfillCheckbox.checked });
      })();
    });
  }

  if (saveDefinitionTranslationCheckbox) {
    saveDefinitionTranslationCheckbox.addEventListener("change", () => {
      void (async () => {
        await updateTranslationSettings({ saveDefinitionTranslation: saveDefinitionTranslationCheckbox.checked });
      })();
    });
  }

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
      updateJaHanPreferenceVisibility();
      await refresh();
    })();
  });

  preferJaHanCheckbox.addEventListener("change", () => {
    void (async () => {
      await updateTranslationSettings({ preferJapaneseForHanSelections: preferJaHanCheckbox.checked });
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
      try {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
          showNoteFeedback(translationApiNote, "! Enter an API key first.", "error");
          return;
        }

        const providerLabel = getProviderLabel(providerSelect.value);
        await setTranslationApiKey(providerSelect.value, apiKey);
        apiKeyInput.value = "";
        showNoteFeedback(translationApiNote, `✓ API key saved for ${providerLabel}.`, "success");
        await refresh();
      } catch {
        const providerLabel = getProviderLabel(providerSelect.value);
        showNoteFeedback(translationApiNote, `! Failed to save API key for ${providerLabel}.`, "error");
      }
    })();
  });

  clearButton.addEventListener("click", () => {
    void (async () => {
      try {
        const providerLabel = getProviderLabel(providerSelect.value);
        await clearTranslationApiKey(providerSelect.value);
        apiKeyInput.value = "";
        showNoteFeedback(translationApiNote, `✓ API key cleared for ${providerLabel}.`, "success");
        await refresh();
      } catch {
        const providerLabel = getProviderLabel(providerSelect.value);
        showNoteFeedback(translationApiNote, `! Failed to clear API key for ${providerLabel}.`, "error");
      }
    })();
  });

  geminiSaveButton.addEventListener("click", () => {
    void (async () => {
      try {
        const endpointUrl = geminiEndpointInput.value.trim();
        const modelId = geminiModelInput.value.trim();
        if (!endpointUrl || !modelId) {
          showNoteFeedback(geminiNote, "! Enter a Gemini base endpoint URL and model ID first.", "error");
          return;
        }

        await writeGeminiConfig({ endpointUrl, modelId });
        showNoteFeedback(geminiNote, "✓ Gemini config saved.", "success");
        await refresh();
      } catch {
        showNoteFeedback(geminiNote, "! Failed to save Gemini config.", "error");
      }
    })();
  });

  geminiClearButton.addEventListener("click", () => {
    void (async () => {
      try {
        await clearGeminiConfig();
        geminiEndpointInput.value = "";
        geminiModelInput.value = "";
        showNoteFeedback(geminiNote, "✓ Gemini config cleared.", "success");
        await refresh();
      } catch {
        showNoteFeedback(geminiNote, "! Failed to clear Gemini config.", "error");
      }
    })();
  });

  deepseekSaveButton.addEventListener("click", () => {
    void (async () => {
      try {
        const endpointUrl = deepseekEndpointInput.value.trim();
        const modelId = deepseekModelInput.value.trim();
        if (!endpointUrl || !modelId) {
          showNoteFeedback(deepseekNote, "! Enter a DeepSeek endpoint URL and model ID first.", "error");
          return;
        }

        await writeDeepSeekConfig({ endpointUrl, modelId });
        showNoteFeedback(deepseekNote, "✓ DeepSeek config saved.", "success");
        await refresh();
      } catch {
        showNoteFeedback(deepseekNote, "! Failed to save DeepSeek config.", "error");
      }
    })();
  });

  deepseekClearButton.addEventListener("click", () => {
    void (async () => {
      try {
        await clearDeepSeekConfig();
        deepseekEndpointInput.value = "";
        deepseekModelInput.value = "";
        showNoteFeedback(deepseekNote, "✓ DeepSeek config cleared.", "success");
        await refresh();
      } catch {
        showNoteFeedback(deepseekNote, "! Failed to clear DeepSeek config.", "error");
      }
    })();
  });

  moonshotSaveButton.addEventListener("click", () => {
    void (async () => {
      try {
        const endpointUrl = moonshotEndpointInput.value.trim();
        const modelId = moonshotModelInput.value.trim();
        if (!endpointUrl || !modelId) {
          showNoteFeedback(moonshotNote, "! Enter a Moonshot endpoint URL and model ID first.", "error");
          return;
        }

        await writeMoonshotConfig({ endpointUrl, modelId });
        showNoteFeedback(moonshotNote, "✓ Moonshot config saved.", "success");
        await refresh();
      } catch {
        showNoteFeedback(moonshotNote, "! Failed to save Moonshot config.", "error");
      }
    })();
  });

  moonshotClearButton.addEventListener("click", () => {
    void (async () => {
      try {
        await clearMoonshotConfig();
        moonshotEndpointInput.value = "";
        moonshotModelInput.value = "";
        showNoteFeedback(moonshotNote, "✓ Moonshot config cleared.", "success");
        await refresh();
      } catch {
        showNoteFeedback(moonshotNote, "! Failed to clear Moonshot config.", "error");
      }
    })();
  });

  openaiSaveButton.addEventListener("click", () => {
    void (async () => {
      try {
        const endpointUrl = openaiEndpointInput.value.trim();
        const modelId = openaiModelInput.value.trim();
        if (!endpointUrl || !modelId) {
          showNoteFeedback(openaiNote, "! Enter an OpenAI endpoint URL and model ID first.", "error");
          return;
        }

        await writeOpenAIConfig({ endpointUrl, modelId });
        showNoteFeedback(openaiNote, "✓ OpenAI config saved.", "success");
        await refresh();
      } catch {
        showNoteFeedback(openaiNote, "! Failed to save OpenAI config.", "error");
      }
    })();
  });

  openaiClearButton.addEventListener("click", () => {
    void (async () => {
      try {
        await clearOpenAIConfig();
        openaiEndpointInput.value = "";
        openaiModelInput.value = "";
        showNoteFeedback(openaiNote, "✓ OpenAI config cleared.", "success");
        await refresh();
      } catch {
        showNoteFeedback(openaiNote, "! Failed to clear OpenAI config.", "error");
      }
    })();
  });

  qwenSaveButton.addEventListener("click", () => {
    void (async () => {
      try {
        const endpointUrl = qwenEndpointInput.value.trim();
        const modelId = qwenModelInput.value.trim();
        if (!endpointUrl || !modelId) {
          showNoteFeedback(qwenNote, "! Enter a Qwen endpoint URL and model ID first.", "error");
          return;
        }

        await writeQwenConfig({ endpointUrl, modelId });
        showNoteFeedback(qwenNote, "✓ Qwen config saved.", "success");
        await refresh();
      } catch {
        showNoteFeedback(qwenNote, "! Failed to save Qwen config.", "error");
      }
    })();
  });

  qwenClearButton.addEventListener("click", () => {
    void (async () => {
      try {
        await clearQwenConfig();
        qwenEndpointInput.value = "";
        qwenModelInput.value = "";
        showNoteFeedback(qwenNote, "✓ Qwen config cleared.", "success");
        await refresh();
      } catch {
        showNoteFeedback(qwenNote, "! Failed to clear Qwen config.", "error");
      }
    })();
  });

  volcengineSaveButton.addEventListener("click", () => {
    void (async () => {
      try {
        const endpointUrl = volcengineEndpointInput.value.trim();
        const modelId = volcengineModelInput.value.trim();
        if (!endpointUrl || !modelId) {
          showNoteFeedback(volcengineNote, "! Enter a Volcengine endpoint URL and model/endpoint ID first.", "error");
          return;
        }

        await writeVolcengineConfig({ endpointUrl, modelId });
        showNoteFeedback(volcengineNote, "✓ Volcengine config saved.", "success");
        await refresh();
      } catch {
        showNoteFeedback(volcengineNote, "! Failed to save Volcengine config.", "error");
      }
    })();
  });

  volcengineClearButton.addEventListener("click", () => {
    void (async () => {
      try {
        await clearVolcengineConfig();
        volcengineEndpointInput.value = "";
        volcengineModelInput.value = "";
        showNoteFeedback(volcengineNote, "✓ Volcengine config cleared.", "success");
        await refresh();
      } catch {
        showNoteFeedback(volcengineNote, "! Failed to clear Volcengine config.", "error");
      }
    })();
  });

  zhipuSaveButton.addEventListener("click", () => {
    void (async () => {
      try {
        const endpointUrl = zhipuEndpointInput.value.trim();
        const modelId = zhipuModelInput.value.trim();
        if (!endpointUrl || !modelId) {
          showNoteFeedback(zhipuNote, "! Enter a Zhipu endpoint URL and model ID first.", "error");
          return;
        }

        await writeZhipuConfig({ endpointUrl, modelId });
        showNoteFeedback(zhipuNote, "✓ Zhipu config saved.", "success");
        await refresh();
      } catch {
        showNoteFeedback(zhipuNote, "! Failed to save Zhipu config.", "error");
      }
    })();
  });

  zhipuClearButton.addEventListener("click", () => {
    void (async () => {
      try {
        await clearZhipuConfig();
        zhipuEndpointInput.value = "";
        zhipuModelInput.value = "";
        showNoteFeedback(zhipuNote, "✓ Zhipu config cleared.", "success");
        await refresh();
      } catch {
        showNoteFeedback(zhipuNote, "! Failed to clear Zhipu config.", "error");
      }
    })();
  });

  void refresh();
};

initialize();
