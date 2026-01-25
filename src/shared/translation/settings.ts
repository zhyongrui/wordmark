export const TRANSLATION_SETTINGS_KEY = "wordmark:translation:settings";

export type TranslationMode = "single" | "dual";
export type TranslationDirection = "EN->ZH" | "ZH->EN";
export type TranslationDualPair = "EN<->ZH";

export type TranslationSettings = {
  enabled: boolean;
  providerId: string;
  mode: TranslationMode;
  singleDirection: TranslationDirection;
  dualPair: TranslationDualPair;
  lastDirection: TranslationDirection;
};

const defaultSettings: TranslationSettings = {
  enabled: false,
  providerId: "gemini",
  mode: "single",
  singleDirection: "EN->ZH",
  dualPair: "EN<->ZH",
  lastDirection: "EN->ZH"
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

const isMode = (value: unknown): value is TranslationMode => value === "single" || value === "dual";

const isDirection = (value: unknown): value is TranslationDirection => value === "EN->ZH" || value === "ZH->EN";

const isDualPair = (value: unknown): value is TranslationDualPair => value === "EN<->ZH";

const parseSettings = (input: unknown): TranslationSettings => {
  if (!input || typeof input !== "object") {
    return defaultSettings;
  }

  const enabled = Boolean((input as { enabled?: unknown }).enabled);
  const providerIdRaw = (input as { providerId?: unknown }).providerId;
  const providerId =
    typeof providerIdRaw === "string" && providerIdRaw.trim() ? providerIdRaw : defaultSettings.providerId;
  const modeRaw = (input as { mode?: unknown }).mode;
  const mode = isMode(modeRaw) ? modeRaw : defaultSettings.mode;
  const singleDirectionRaw = (input as { singleDirection?: unknown }).singleDirection;
  const singleDirection = isDirection(singleDirectionRaw) ? singleDirectionRaw : defaultSettings.singleDirection;
  const dualPairRaw = (input as { dualPair?: unknown }).dualPair;
  const dualPair = isDualPair(dualPairRaw) ? dualPairRaw : defaultSettings.dualPair;
  const lastDirectionRaw = (input as { lastDirection?: unknown }).lastDirection;
  const lastDirection = isDirection(lastDirectionRaw) ? lastDirectionRaw : singleDirection;

  return {
    enabled,
    providerId,
    mode,
    singleDirection,
    dualPair,
    lastDirection
  };
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
    memoryStore.data = { ...settings };
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
    providerId: typeof update.providerId === "string" ? update.providerId : current.providerId,
    mode: isMode(update.mode) ? update.mode : current.mode,
    singleDirection: isDirection(update.singleDirection) ? update.singleDirection : current.singleDirection,
    dualPair: isDualPair(update.dualPair) ? update.dualPair : current.dualPair,
    lastDirection: isDirection(update.lastDirection) ? update.lastDirection : current.lastDirection
  };

  await writeTranslationSettings(next);
  return next;
};
