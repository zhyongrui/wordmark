export const TRANSLATION_SECRETS_KEY = "wordmark:translation:secrets";

export type TranslationSecrets = {
  providerId: string;
  apiKey: string;
};

type StorageArea = {
  get: (keys: string | string[]) => Promise<Record<string, unknown>> | void;
  set: (items: Record<string, unknown>) => Promise<void> | void;
};

type TranslationSecretsRecord = TranslationSecrets & {
  updatedAt: string;
};

const memoryStore: { data: TranslationSecretsRecord | null } = { data: null };

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

const parseSecrets = (input: unknown): TranslationSecretsRecord | null => {
  if (!input || typeof input !== "object") {
    return null;
  }

  const providerIdRaw = (input as { providerId?: unknown }).providerId;
  const apiKeyRaw = (input as { apiKey?: unknown }).apiKey;
  const updatedAtRaw = (input as { updatedAt?: unknown }).updatedAt;

  if (typeof providerIdRaw !== "string" || typeof apiKeyRaw !== "string") {
    return null;
  }

  return {
    providerId: providerIdRaw,
    apiKey: apiKeyRaw,
    updatedAt: typeof updatedAtRaw === "string" ? updatedAtRaw : new Date(0).toISOString()
  };
};

export const readTranslationSecrets = async (): Promise<TranslationSecrets | null> => {
  const storage = getStorageArea();
  if (!storage) {
    return memoryStore.data;
  }

  const result = await readFromChrome(storage);
  return parseSecrets(result[TRANSLATION_SECRETS_KEY]);
};

export const setTranslationApiKey = async (providerId: string, apiKey: string): Promise<void> => {
  const payload: TranslationSecretsRecord = {
    providerId,
    apiKey,
    updatedAt: new Date().toISOString()
  };

  const storage = getStorageArea();
  if (!storage) {
    memoryStore.data = payload;
    return;
  }

  await writeToChrome(storage, payload);
};

export const clearTranslationApiKey = async (): Promise<void> => {
  const storage = getStorageArea();
  if (!storage) {
    memoryStore.data = null;
    return;
  }

  await writeToChrome(storage, null);
};

export const getTranslationApiKey = async (): Promise<string | null> => {
  const secrets = await readTranslationSecrets();
  const apiKey = secrets?.apiKey?.trim();
  return apiKey ? apiKey : null;
};

export const hasTranslationApiKey = async (): Promise<boolean> => {
  return (await getTranslationApiKey()) != null;
};
