import type { TranslationRequest, TranslationResponse } from "../types";

export type TranslationProvider = {
  id: string;
  translate: (request: TranslationRequest, apiKey: string, options?: { signal?: AbortSignal }) => Promise<TranslationResponse>;
};

