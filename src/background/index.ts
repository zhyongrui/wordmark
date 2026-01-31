import { MessageTypes, type DefinitionBackfillRequestPayload } from "../shared/messages";
import {
  handleDefinitionBackfillRequest,
} from "./handlers/definition-backfill";
import { handleLookupRequest, type LookupRequestPayload } from "./handlers/lookup";
import { handleTranslationRequest, type TranslationRequestPayload } from "./handlers/translation";
import {
  handleDeleteWord,
  handleListWords,
  handleAddWord,
  handleRestoreWord,
  handleSetWordHighlight,
  handleAddHighlightOnlyWord,
  handleRemoveHighlightOnlyWord,
  handleAddHighlightMutedWord,
  handleRemoveHighlightMutedWord,
  type DeleteWordPayload,
  type AddWordPayload,
  type RestoreWordPayload,
  type SetWordHighlightPayload,
  type HighlightOnlyPayload
} from "./handlers/words";
import {
  handleGetHighlightPreference,
  handleSetHighlightPreference,
  type SetHighlightPreferencePayload
} from "./handlers/preferences";

const queryTabs = async (queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> => {
  if (!chrome?.tabs?.query) {
    return [];
  }

  try {
    const result = chrome.tabs.query(queryInfo);
    if (result && typeof (result as Promise<chrome.tabs.Tab[]>).then === "function") {
      return await (result as Promise<chrome.tabs.Tab[]>);
    }

    return await new Promise((resolve) => {
      chrome.tabs.query(queryInfo, (tabs) => resolve(tabs));
    });
  } catch {
    return [];
  }
};

const getActiveTabId = async (): Promise<number | null> => {
  const [currentTab] = await queryTabs({ active: true, currentWindow: true });
  if (currentTab?.id != null) {
    return currentTab.id;
  }

  const [fallbackTab] = await queryTabs({ active: true });
  return fallbackTab?.id ?? null;
};

const sendLookupTrigger = async (): Promise<void> => {
  const tabId = await getActiveTabId();
  if (!tabId) {
    console.warn("[WordMark] No active tab found; aborting lookup.");
    return;
  }

  if (!chrome?.tabs?.sendMessage) {
    return;
  }

  try {
    const result = chrome.tabs.sendMessage(tabId, { type: MessageTypes.LookupTrigger });
    if (result && typeof (result as Promise<void>).then === "function") {
      await result;
    }
  } catch (error) {
    console.warn("[WordMark] Failed to send lookup trigger.", error);
  }
};

const openOptionsPage = async (): Promise<void> => {
  try {
    if (chrome?.runtime?.openOptionsPage) {
      await chrome.runtime.openOptionsPage();
      return;
    }
  } catch {
    // fallback below
  }

  if (!chrome?.runtime?.getURL || !chrome?.tabs?.create) {
    return;
  }

  const url = chrome.runtime.getURL("options.html");
  try {
    const result = chrome.tabs.create({ url });
    if (result && typeof (result as Promise<chrome.tabs.Tab>).then === "function") {
      await result;
    }
  } catch (error) {
    console.warn("[WordMark] Failed to open options page on install.", error);
  }
};

const initializeBackground = () => {
  if (chrome?.runtime?.onInstalled) {
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === "install") {
        void openOptionsPage();
      }
    });
  }

  if (chrome?.commands?.onCommand) {
    chrome.commands.onCommand.addListener((command) => {
      if (command === "lookup-word") {
        void sendLookupTrigger();
      }
    });
  }

  if (chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      const type = typeof message === "object" && message ? (message as { type?: unknown }).type : undefined;
      if (typeof type !== "string") {
        return;
      }

      const payload = (message as { payload?: unknown }).payload;

      switch (type) {
        case MessageTypes.LookupRequest:
          handleLookupRequest(payload as LookupRequestPayload).then(sendResponse);
          return true;
        case MessageTypes.ListWords:
          handleListWords().then(sendResponse);
          return true;
        case MessageTypes.DeleteWord:
          handleDeleteWord(payload as DeleteWordPayload).then(sendResponse);
          return true;
        case MessageTypes.AddWord:
          handleAddWord(payload as AddWordPayload).then(sendResponse);
          return true;
        case MessageTypes.RestoreWord:
          handleRestoreWord(payload as RestoreWordPayload).then(sendResponse);
          return true;
        case MessageTypes.SetWordHighlight:
          handleSetWordHighlight(payload as SetWordHighlightPayload).then(sendResponse);
          return true;
        case MessageTypes.AddHighlightOnlyWord:
          handleAddHighlightOnlyWord(payload as HighlightOnlyPayload).then(sendResponse);
          return true;
        case MessageTypes.RemoveHighlightOnlyWord:
          handleRemoveHighlightOnlyWord(payload as HighlightOnlyPayload).then(sendResponse);
          return true;
        case MessageTypes.AddHighlightMutedWord:
          handleAddHighlightMutedWord(payload as HighlightOnlyPayload).then(sendResponse);
          return true;
        case MessageTypes.RemoveHighlightMutedWord:
          handleRemoveHighlightMutedWord(payload as HighlightOnlyPayload).then(sendResponse);
          return true;
        case MessageTypes.GetHighlightPreference:
          handleGetHighlightPreference().then(sendResponse);
          return true;
        case MessageTypes.SetHighlightPreference:
          handleSetHighlightPreference(payload as SetHighlightPreferencePayload).then(sendResponse);
          return true;
        case MessageTypes.TranslationRequest:
          handleTranslationRequest(payload as TranslationRequestPayload).then(sendResponse);
          return true;
        case MessageTypes.DefinitionBackfillRequest:
          handleDefinitionBackfillRequest(payload as DefinitionBackfillRequestPayload).then(sendResponse);
          return true;
        default:
          return;
      }
    });
  }
};

initializeBackground();
