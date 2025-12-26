const WORD_PATTERN = /[a-z]+(?:['-][a-z]+)*/g;

export const normalizeWord = (raw: string): string | null => {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  const matches = trimmed.match(WORD_PATTERN);
  if (!matches || matches.length !== 1) {
    return null;
  }

  return matches[0] ?? null;
};
