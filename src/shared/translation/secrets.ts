export const TRANSLATION_SECRETS_KEY = "wordmark:translation:secrets";

export type TranslationApiKeyEntry = {
  apiKey: string;
  updatedAt: string;
};

export type TranslationSecrets = {
  keys: Record<string, TranslationApiKeyEntry>;
};

type StorageArea = {
  get: (keys: string | string[]) => Promise<Record<string, unknown>> | void;
  set: (items: Record<string, unknown>) => Promise<void> | void;
};

type TranslationSecretsRecord = TranslationSecrets;

type LegacyTranslationSecretsRecord = {
  providerId?: unknown;
  apiKey?: unknown;
  updatedAt?: unknown;
};

const defaultSecrets: TranslationSecrets = { keys: {} };

const memoryStore: { data: TranslationSecretsRecord } = { data: defaultSecrets };

const getStorageArea = (): StorageArea | null => {
  const chromeRef = (globalThis as { chrome?: { storage?: { local?: StorageArea } } }).chrome;
  return chromeRef?.storage?.local ?? null;
};

const readFromChrome = async (storage: StorageArea): Promise<Record<string, unknown>> => {
  return await new Promise((resolve) => {
    try {
      const result = storage.get([TRANSLATION_SECRETS_KEY]);
      if (result && typeof (result as Promise<Record<string, unknown>>).then === "function") {
        (result as Promise<Record<string, unknown>>)
          .then(resolve)
          .catch(() => resolve({}));
      } else {
        (
          storage as unknown as {
            get: (keys: string[], cb: (items: Record<string, unknown>) => void) => void;
          }
        ).get([TRANSLATION_SECRETS_KEY], (items) => resolve(items));
      }
    } catch {
      resolve({});
    }
  });
};

const writeToChrome = async (storage: StorageArea, payload: TranslationSecretsRecord | null): Promise<void> => {
  await new Promise((resolve) => {
    try {
      const result = storage.set({ [TRANSLATION_SECRETS_KEY]: payload });
      if (result && typeof (result as Promise<void>).then === "function") {
        (result as Promise<void>).then(() => resolve(undefined)).catch(() => resolve(undefined));
      } else {
        (
          storage as unknown as {
            set: (items: Record<string, unknown>, cb: () => void) => void;
          }
        ).set({ [TRANSLATION_SECRETS_KEY]: payload }, () => resolve(undefined));
      }
    } catch {
      resolve(undefined);
    }
  });
};

const parseSecrets = (
  input: unknown
): { secrets: TranslationSecretsRecord; needsMigration: boolean } => {
  if (!input || typeof input !== "object") {
    return { secrets: defaultSecrets, needsMigration: false };
  }

  if ("keys" in input) {
    const keysRaw = (input as { keys?: unknown }).keys;
    if (!keysRaw || typeof keysRaw !== "object") {
      return { secrets: defaultSecrets, needsMigration: false };
    }

    const keys: Record<string, TranslationApiKeyEntry> = {};
    for (const [providerId, entry] of Object.entries(keysRaw as Record<string, unknown>)) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const apiKeyRaw = (entry as { apiKey?: unknown }).apiKey;
      const updatedAtRaw = (entry as { updatedAt?: unknown }).updatedAt;
      if (typeof apiKeyRaw !== "string" || !apiKeyRaw.trim()) {
        continue;
      }
      keys[providerId] = {
        apiKey: apiKeyRaw,
        updatedAt: typeof updatedAtRaw === "string" ? updatedAtRaw : new Date(0).toISOString()
      };
    }

    return { secrets: { keys }, needsMigration: false };
  }

  const legacy = input as LegacyTranslationSecretsRecord;
  if (typeof legacy.providerId === "string" && typeof legacy.apiKey === "string" && legacy.apiKey.trim()) {
    return {
      secrets: {
        keys: {
          [legacy.providerId]: {
            apiKey: legacy.apiKey,
            updatedAt: typeof legacy.updatedAt === "string" ? legacy.updatedAt : new Date(0).toISOString()
          }
        }
      },
      needsMigration: true
    };
  }

  return { secrets: defaultSecrets, needsMigration: false };
};

export const readTranslationSecrets = async (): Promise<TranslationSecrets> => {
  const storage = getStorageArea();
  if (!storage) {
    return memoryStore.data;
  }

  const result = await readFromChrome(storage);
  const parsed = parseSecrets(result[TRANSLATION_SECRETS_KEY]);
  if (parsed.needsMigration) {
    await writeToChrome(storage, parsed.secrets);
  }
  return parsed.secrets;
};

export const setTranslationApiKey = async (providerId: string, apiKey: string): Promise<void> => {
  const current = await readTranslationSecrets();
  const next: TranslationSecretsRecord = {
    keys: {
      ...current.keys,
      [providerId]: { apiKey, updatedAt: new Date().toISOString() }
    }
  };

  const storage = getStorageArea();
  if (!storage) {
    memoryStore.data = next;
    return;
  }

  await writeToChrome(storage, next);
};

export const clearTranslationApiKey = async (providerId: string): Promise<void> => {
  const current = await readTranslationSecrets();
  const next: TranslationSecretsRecord = { keys: { ...current.keys } };
  delete next.keys[providerId];

  const storage = getStorageArea();
  if (!storage) {
    memoryStore.data = next;
    return;
  }

  await writeToChrome(storage, next);
};

export const getTranslationApiKey = async (providerId: string): Promise<string | null> => {
  const secrets = await readTranslationSecrets();
  const apiKey = secrets.keys[providerId]?.apiKey?.trim();
  return apiKey ? apiKey : null;
};

export const hasTranslationApiKey = async (providerId: string): Promise<boolean> => {
  return (await getTranslationApiKey(providerId)) != null;
};
