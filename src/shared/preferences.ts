import { Preferences } from "./storage/schema";
import { readStore, writeStore } from "./word/store";

const DEFAULT_PREFERENCES: Preferences = { highlightEnabled: true };

export const readPreferences = async (): Promise<Preferences> => {
  const store = await readStore();
  return store.preferences ?? DEFAULT_PREFERENCES;
};

export const writePreferences = async (next: Preferences): Promise<void> => {
  const store = await readStore();
  await writeStore({
    ...store,
    preferences: {
      ...store.preferences,
      ...next
    }
  });
};
