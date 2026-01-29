import type { WordLanguage } from "../word/normalize";

export type TranslationTargetLang = "zh" | "en" | "ja";

export type TranslationRequest = {
  word: string;
  definition?: string | null;
  sourceLang: WordLanguage;
  targetLang: TranslationTargetLang;
};

export type TranslationErrorCode =
  | "disabled"
  | "not_configured"
  | "offline"
  | "quota_exceeded"
  | "timeout"
  | "provider_error";

export type TranslationSuccess = {
  ok: true;
  translatedWord: string;
  translatedDefinition?: string | null;
};

export type TranslationError = {
  ok: false;
  error: TranslationErrorCode;
  message?: string;
};

export type TranslationResponse = TranslationSuccess | TranslationError;

const DEFAULT_ERROR_MESSAGES: Record<TranslationErrorCode, string> = {
  disabled: "Translation is disabled.",
  not_configured: "Translation is not configured.",
  offline: "Translation unavailable (offline).",
  quota_exceeded: "Translation unavailable (quota exceeded).",
  timeout: "Translation timed out.",
  provider_error: "Translation unavailable (provider error)."
};

const sanitizeTranslationMessage = (message: string): string => {
  let next = message;

  next = next.replace(/AIza[0-9A-Za-z\-_]{8,}/g, "[redacted]");
  next = next.replace(/apiKey\s*=\s*[^&\s]+/gi, "apiKey=[redacted]");
  next = next.replace(/key\s*=\s*[^&\s]+/gi, "key=[redacted]");

  return next.trim();
};

export const createTranslationError = (error: TranslationErrorCode, message?: string): TranslationError => {
  const safeMessage =
    typeof message === "string" && message.trim() ? sanitizeTranslationMessage(message) : "";
  return { ok: false, error, message: safeMessage || DEFAULT_ERROR_MESSAGES[error] };
};

export const mapHttpStatusToTranslationErrorCode = (status: number): TranslationErrorCode => {
  if (status === 429) {
    return "quota_exceeded";
  }
  return "provider_error";
};

export const mapUnknownErrorToTranslationErrorCode = (error: unknown): TranslationErrorCode => {
  if (
    typeof error === "object" &&
    error != null &&
    "name" in error &&
    typeof (error as { name?: unknown }).name === "string" &&
    (error as { name: string }).name === "AbortError"
  ) {
    return "timeout";
  }

  if (error instanceof TypeError) {
    return "offline";
  }

  return "provider_error";
};
