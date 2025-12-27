import { MAX_GENERATED_DEFINITION_CHARS } from "./types";

const stripCodeFences = (text: string): string => {
  const match = text.match(/```(?:text|md|markdown)?\s*([\s\S]*?)\s*```/i);
  return match?.[1] ? match[1] : text;
};

const stripLeadingMarker = (text: string): string => {
  return text.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "");
};

const stripSurroundingQuotes = (text: string): string => {
  const trimmed = text.trim();
  const pairs: Array<[string, string]> = [
    ['"', '"'],
    ["“", "”"],
    ["'", "'"]
  ];

  for (const [start, end] of pairs) {
    if (trimmed.startsWith(start) && trimmed.endsWith(end) && trimmed.length > start.length + end.length) {
      return trimmed.slice(start.length, -end.length).trim();
    }
  }

  return trimmed;
};

const collapseWhitespace = (text: string): string => text.replace(/\s+/g, " ").trim();

const clampText = (text: string, maxChars: number): string => {
  if (text.length <= maxChars) {
    return text;
  }

  const slice = text.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > Math.min(80, Math.floor(maxChars * 0.6))) {
    return slice.slice(0, lastSpace).trim();
  }

  return slice.trim();
};

export const sanitizeEnglishDefinitionText = (raw: string, options?: { maxChars?: number }): string | null => {
  if (typeof raw !== "string") {
    return null;
  }

  const maxChars = options?.maxChars ?? MAX_GENERATED_DEFINITION_CHARS;
  let text = raw;
  text = stripCodeFences(text);
  text = stripSurroundingQuotes(text);
  text = stripLeadingMarker(text);
  text = collapseWhitespace(text);
  text = clampText(text, maxChars);

  return text ? text : null;
};

