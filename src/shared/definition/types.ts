export const MAX_GENERATED_DEFINITION_CHARS = 240;

export type DefinitionLanguage = "en" | "zh" | "ja";

export type DefinitionRequest = {
  word: string;
  sourceLang: DefinitionLanguage;
};

export type DefinitionErrorCode = "offline" | "quota_exceeded" | "timeout" | "provider_error";

export type DefinitionSuccess = {
  ok: true;
  definitionText: string;
  definitionLang: DefinitionLanguage;
};

export type DefinitionError = {
  ok: false;
  error: DefinitionErrorCode;
  message?: string;
};

export type DefinitionResponse = DefinitionSuccess | DefinitionError;

const DEFAULT_ERROR_MESSAGES: Record<DefinitionErrorCode, string> = {
  offline: "Definition unavailable (offline).",
  quota_exceeded: "Definition unavailable (quota exceeded).",
  timeout: "Definition request timed out.",
  provider_error: "Definition unavailable (provider error)."
};

const sanitizeDefinitionMessage = (message: string): string => {
  let next = message;

  next = next.replace(/AIza[0-9A-Za-z\-_]{8,}/g, "[redacted]");
  next = next.replace(/apiKey\s*=\s*[^&\s]+/gi, "apiKey=[redacted]");
  next = next.replace(/key\s*=\s*[^&\s]+/gi, "key=[redacted]");

  return next.trim();
};

export const createDefinitionError = (error: DefinitionErrorCode, message?: string): DefinitionError => {
  const safeMessage =
    typeof message === "string" && message.trim() ? sanitizeDefinitionMessage(message) : "";
  return { ok: false, error, message: safeMessage || DEFAULT_ERROR_MESSAGES[error] };
};

export const mapHttpStatusToDefinitionErrorCode = (status: number): DefinitionErrorCode => {
  if (status === 429) {
    return "quota_exceeded";
  }
  return "provider_error";
};

export const mapUnknownErrorToDefinitionErrorCode = (error: unknown): DefinitionErrorCode => {
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
