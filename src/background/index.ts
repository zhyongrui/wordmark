import { MessageTypes } from "../shared/messages";
import { handleLookupRequest, type LookupRequestPayload } from "./handlers/lookup";
import { handleDeleteWord, handleListWords, type DeleteWordPayload } from "./handlers/words";
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

const initializeBackground = () => {
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
        case MessageTypes.GetHighlightPreference:
          handleGetHighlightPreference().then(sendResponse);
          return true;
        case MessageTypes.SetHighlightPreference:
          handleSetHighlightPreference(payload as SetHighlightPreferencePayload).then(sendResponse);
          return true;
        default:
          return;
      }
    });
  }
};

initializeBackground();
