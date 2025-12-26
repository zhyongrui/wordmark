import type { WordEntry } from "../storage/schema";

export const sortWordEntries = (entries: WordEntry[]): WordEntry[] => {
  return [...entries].sort((a, b) => {
    if (b.queryCount !== a.queryCount) {
      return b.queryCount - a.queryCount;
    }
    if (b.lastQueriedAt !== a.lastQueriedAt) {
      return b.lastQueriedAt.localeCompare(a.lastQueriedAt);
    }
    return a.normalizedWord.localeCompare(b.normalizedWord);
  });
};

export const filterWordEntries = (entries: WordEntry[], query: string): WordEntry[] => {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return entries;
  }

  return entries.filter((entry) => {
    const displayWord = entry.displayWord.toLowerCase();
    const normalizedWord = entry.normalizedWord.toLowerCase();
    return displayWord.includes(trimmed) || normalizedWord.includes(trimmed);
  });
};
