export const MessageTypes = {
  LookupTrigger: "lookup:trigger",
  LookupRequest: "lookup:request",
  ListWords: "words:list",
  DeleteWord: "words:delete",
  AddWord: "words:add",
  RestoreWord: "words:restore",
  SetWordHighlight: "words:highlight:set",
  AddHighlightOnlyWord: "words:highlight-only:add",
  RemoveHighlightOnlyWord: "words:highlight-only:remove",
  AddHighlightMutedWord: "words:highlight-muted:add",
  RemoveHighlightMutedWord: "words:highlight-muted:remove",
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

export type DefinitionSource = "local" | "generated" | "none";

export type DefinitionBackfillRequestPayload = {
  word: string;
  // Optional: provide the source language chosen by the content script.
  // Used to disambiguate Kanji-only (Han-only) selections between ZH/JA.
  sourceLang?: "en" | "zh" | "ja";
};

export type DefinitionBackfillResponse =
  | {
      ok: true;
      definitionSourceLang: "en" | "zh" | "ja";
      definitionEn: string | null;
      definitionZh: string | null;
      definitionJa: string | null;
      definitionSource: DefinitionSource;
    }
  | {
      ok: false;
      error: "disabled" | "not_configured" | "offline" | "quota_exceeded" | "timeout" | "provider_error";
      message?: string;
    };
