/* eslint-disable @typescript-eslint/no-namespace */

export {};

declare global {
  namespace chrome {
    namespace tabs {
      type Tab = {
        id?: number;
        url?: string;
      };

      type QueryInfo = {
        active?: boolean;
        currentWindow?: boolean;
      };

      type CreateProperties = {
        url?: string;
      };

      function query(queryInfo: QueryInfo): Promise<Tab[]> | void;
      function query(queryInfo: QueryInfo, callback: (tabs: Tab[]) => void): void;

      function sendMessage(tabId: number, message: unknown): Promise<unknown> | void;
      function sendMessage(
        tabId: number,
        message: unknown,
        callback: (response: unknown) => void
      ): void;

      function create(createProperties: CreateProperties): Promise<Tab> | void;
      function create(createProperties: CreateProperties, callback: (tab: Tab) => void): void;
    }

    namespace commands {
      const onCommand:
        | {
            addListener: (callback: (command: string) => void) => void;
          }
        | undefined;
    }

    namespace runtime {
      type MessageSender = Record<string, unknown>;
      type SendResponse = (response?: unknown) => void;
      type InstalledDetails = {
        reason?: string;
        previousVersion?: string;
      };

      function sendMessage(message: unknown): Promise<unknown> | void;
      function sendMessage(message: unknown, callback: (response: unknown) => void): void;

      const onMessage:
        | {
            addListener: (
              callback: (
                message: unknown,
                sender: MessageSender,
                sendResponse: SendResponse
              ) => void | boolean
            ) => void;
          }
        | undefined;

      function getURL(path: string): string;
      function openOptionsPage(): Promise<void> | void;

      const onInstalled:
        | {
            addListener: (callback: (details: InstalledDetails) => void) => void;
          }
        | undefined;
    }

    namespace storage {
      type StorageChange = {
        oldValue?: unknown;
        newValue?: unknown;
      };

      const onChanged:
        | {
            addListener: (callback: (changes: Record<string, StorageChange>, areaName: string) => void) => void;
          }
        | undefined;
    }
  }
}
