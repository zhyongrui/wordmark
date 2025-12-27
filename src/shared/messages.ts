export const MessageTypes = {
  LookupTrigger: "lookup:trigger",
  LookupRequest: "lookup:request",
  ListWords: "words:list",
  DeleteWord: "words:delete",
  GetHighlightPreference: "preferences:highlight:get",
  SetHighlightPreference: "preferences:highlight:set",
  TranslationRequest: "translation:request",
  TranslationGetSettings: "translation:settings:get",
  TranslationSetSettings: "translation:settings:set"
} as const;

export type MessageType = (typeof MessageTypes)[keyof typeof MessageTypes];

export type Message<T = unknown> = {
  type: MessageType;
  payload?: T;
};
