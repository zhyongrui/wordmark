export const TRANSLATION_SETTINGS_KEY = "wordmark:translation:settings";

export type TranslationSettings = {
  enabled: boolean;
  providerId: string;
};

const defaultSettings: TranslationSettings = {
  enabled: false,
  providerId: "gemini"
};

type StorageArea = {
  get: (keys: string | string[]) => Promise<Record<string, unknown>> | void;
  set: (items: Record<string, unknown>) => Promise<void> | void;
};

type TranslationSettingsRecord = TranslationSettings & {
  updatedAt: string;
};

const memoryStore: { data: TranslationSettings } = { data: defaultSettings };

const getStorageArea = (): StorageArea | null => {
  const chromeRef = (globalThis as { chrome?: { storage?: { local?: StorageArea } } }).chrome;
  return chromeRef?.storage?.local ?? null;
};

const readFromChrome = async (storage: StorageArea): Promise<Record<string, unknown>> => {
  return await new Promise((resolve) => {
    try {
      const result = storage.get([TRANSLATION_SETTINGS_KEY]);
      if (result && typeof (result as Promise<Record<string, unknown>>).then === "function") {
        (result as Promise<Record<string, unknown>>)
          .then(resolve)
          .catch(() => resolve({}));
      } else {
        (
          storage as unknown as {
            get: (keys: string[], cb: (items: Record<string, unknown>) => void) => void;
          }
        ).get([TRANSLATION_SETTINGS_KEY], (items) => resolve(items));
      }
    } catch {
      resolve({});
    }
  });
};

const writeToChrome = async (storage: StorageArea, payload: TranslationSettingsRecord): Promise<void> => {
  await new Promise((resolve) => {
    try {
      const result = storage.set({ [TRANSLATION_SETTINGS_KEY]: payload });
      if (result && typeof (result as Promise<void>).then === "function") {
        (result as Promise<void>).then(() => resolve(undefined)).catch(() => resolve(undefined));
      } else {
        (
          storage as unknown as {
            set: (items: Record<string, unknown>, cb: () => void) => void;
          }
        ).set({ [TRANSLATION_SETTINGS_KEY]: payload }, () => resolve(undefined));
      }
    } catch {
      resolve(undefined);
    }
  });
};

const parseSettings = (input: unknown): TranslationSettings => {
  if (!input || typeof input !== "object") {
    return defaultSettings;
  }

  const enabled = Boolean((input as { enabled?: unknown }).enabled);
  const providerIdRaw = (input as { providerId?: unknown }).providerId;
  const providerId =
    typeof providerIdRaw === "string" && providerIdRaw.trim() ? providerIdRaw : defaultSettings.providerId;

  return { enabled, providerId };
};

export const readTranslationSettings = async (): Promise<TranslationSettings> => {
  const storage = getStorageArea();
  if (!storage) {
    return memoryStore.data;
  }

  const result = await readFromChrome(storage);
  return parseSettings(result[TRANSLATION_SETTINGS_KEY]);
};

export const writeTranslationSettings = async (settings: TranslationSettings): Promise<void> => {
  const payload: TranslationSettingsRecord = {
    ...settings,
    updatedAt: new Date().toISOString()
  };

  const storage = getStorageArea();
  if (!storage) {
    memoryStore.data = { enabled: settings.enabled, providerId: settings.providerId };
    return;
  }

  await writeToChrome(storage, payload);
};

export const updateTranslationSettings = async (
  update: Partial<TranslationSettings>
): Promise<TranslationSettings> => {
  const current = await readTranslationSettings();
  const next: TranslationSettings = {
    enabled: typeof update.enabled === "boolean" ? update.enabled : current.enabled,
    providerId: typeof update.providerId === "string" ? update.providerId : current.providerId
  };

  await writeTranslationSettings(next);
  return next;
};
