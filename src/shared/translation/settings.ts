export const TRANSLATION_SETTINGS_KEY = "wordmark:translation:settings";

export type TranslationMode = "single" | "dual";
export type TranslationDirection =
  | "EN->ZH"
  | "ZH->EN"
  | "EN->JA"
  | "JA->EN"
  | "ZH->JA"
  | "JA->ZH";
export type TranslationDualPair = "EN<->ZH" | "EN<->JA" | "ZH<->JA";

export type TranslationSettings = {
  enabled: boolean;
  providerId: string;
  mode: TranslationMode;
  singleDirection: TranslationDirection;
  dualPair: TranslationDualPair;
  lastDirection: TranslationDirection;
  definitionBackfillEnabled: boolean;
  definitionTranslationEnabled: boolean;
  saveDefinitionBackfill: boolean;
  saveDefinitionTranslation: boolean;
};

const defaultSettings: TranslationSettings = {
  enabled: true,
  providerId: "gemini",
  mode: "single",
  singleDirection: "EN->ZH",
  dualPair: "EN<->ZH",
  lastDirection: "EN->ZH",
  definitionBackfillEnabled: false,
  definitionTranslationEnabled: false,
  saveDefinitionBackfill: true,
  saveDefinitionTranslation: true
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

const isDirection = (value: unknown): value is TranslationDirection =>
  value === "EN->ZH" ||
  value === "ZH->EN" ||
  value === "EN->JA" ||
  value === "JA->EN" ||
  value === "ZH->JA" ||
  value === "JA->ZH";

const isDualPair = (value: unknown): value is TranslationDualPair =>
  value === "EN<->ZH" || value === "EN<->JA" || value === "ZH<->JA";

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
  const definitionBackfillRaw = (input as { definitionBackfillEnabled?: unknown }).definitionBackfillEnabled;
  const definitionBackfillEnabled =
    typeof definitionBackfillRaw === "boolean" ? definitionBackfillRaw : defaultSettings.definitionBackfillEnabled;
  const definitionTranslationRaw = (input as { definitionTranslationEnabled?: unknown }).definitionTranslationEnabled;
  const definitionTranslationEnabled =
    typeof definitionTranslationRaw === "boolean"
      ? definitionTranslationRaw
      : defaultSettings.definitionTranslationEnabled;
  const saveDefinitionBackfillRaw = (input as { saveDefinitionBackfill?: unknown }).saveDefinitionBackfill;
  const saveDefinitionBackfill =
    typeof saveDefinitionBackfillRaw === "boolean" ? saveDefinitionBackfillRaw : defaultSettings.saveDefinitionBackfill;
  const saveDefinitionTranslationRaw = (input as { saveDefinitionTranslation?: unknown }).saveDefinitionTranslation;
  const saveDefinitionTranslation =
    typeof saveDefinitionTranslationRaw === "boolean"
      ? saveDefinitionTranslationRaw
      : defaultSettings.saveDefinitionTranslation;

  return {
    enabled,
    providerId,
    mode,
    singleDirection,
    dualPair,
    lastDirection,
    definitionBackfillEnabled,
    definitionTranslationEnabled,
    saveDefinitionBackfill,
    saveDefinitionTranslation
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
    lastDirection: isDirection(update.lastDirection) ? update.lastDirection : current.lastDirection,
    definitionBackfillEnabled:
      typeof update.definitionBackfillEnabled === "boolean"
        ? update.definitionBackfillEnabled
        : current.definitionBackfillEnabled,
    definitionTranslationEnabled:
      typeof update.definitionTranslationEnabled === "boolean"
        ? update.definitionTranslationEnabled
        : current.definitionTranslationEnabled,
    saveDefinitionBackfill:
      typeof update.saveDefinitionBackfill === "boolean" ? update.saveDefinitionBackfill : current.saveDefinitionBackfill,
    saveDefinitionTranslation:
      typeof update.saveDefinitionTranslation === "boolean"
        ? update.saveDefinitionTranslation
        : current.saveDefinitionTranslation
  };

  await writeTranslationSettings(next);
  return next;
};
