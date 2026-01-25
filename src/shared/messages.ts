export const MessageTypes = {
  LookupTrigger: "lookup:trigger",
  LookupRequest: "lookup:request",
  ListWords: "words:list",
  DeleteWord: "words:delete",
  GetHighlightPreference: "preferences:highlight:get",
  SetHighlightPreference: "preferences:highlight:set",
  TranslationRequest: "translation:request",
  DefinitionBackfillRequest: "definition:backfill:request",
  TranslationGetSettings: "translation:settings:get",
  TranslationSetSettings: "translation:settings:set"
} as const;

export type MessageType = (typeof MessageTypes)[keyof typeof MessageTypes];

export type Message<T = unknown> = {
  type: MessageType;
  payload?: T;
};

export type DefinitionSource = "local" | "generated";

export type DefinitionBackfillRequestPayload = {
  word: string;
};

export type DefinitionBackfillResponse =
  | {
      ok: true;
      definitionSourceLang: "en" | "zh";
      definitionEn: string | null;
      definitionZh: string | null;
      definitionSource: DefinitionSource;
    }
  | {
      ok: false;
      error: "disabled" | "not_configured" | "offline" | "quota_exceeded" | "timeout" | "provider_error";
      message?: string;
    };
