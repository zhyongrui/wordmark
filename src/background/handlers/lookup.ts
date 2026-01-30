import type { DefinitionSource } from "../../shared/messages";
import { shapeLookupResult } from "../../shared/word/lookup";
import { normalizeSelection } from "../../shared/word/normalize";
import { recordLookup } from "../../shared/word/store";

export type LookupRequestPayload = {
  selectedText: string;
  ttsAvailable: boolean;
};

export type LookupResponse =
  | { ok: true; entry: Awaited<ReturnType<typeof recordLookup>> & { definitionSource: DefinitionSource } }
  | { ok: false; error: "invalid-selection" | "invalid-payload" };

export const handleLookupRequest = async (payload: LookupRequestPayload): Promise<LookupResponse> => {
  if (!payload || typeof payload.selectedText !== "string") {
    return { ok: false, error: "invalid-payload" };
  }

  const selection = normalizeSelection(payload.selectedText);
  if (!selection) {
    return { ok: false, error: "invalid-selection" };
  }

  const result = shapeLookupResult({
    normalizedWord: selection.normalizedWord,
    displayWord: payload.selectedText,
    dictionaryEntry: null,
    ttsAvailable: Boolean(payload.ttsAvailable)
  });

  const storedEntry = await recordLookup(result);
  const entry = {
    ...storedEntry,
    definition: result.definition,
    definitionSource: "local" as const,
    pronunciationAvailable: result.pronunciationAvailable
  };
  return { ok: true, entry };
};
