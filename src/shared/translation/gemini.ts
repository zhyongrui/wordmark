export const GEMINI_CONFIG_KEY = "wordmark:translation:gemini";

export type GeminiConfig = {
  endpointUrl: string;
  modelId: string;
};

type StorageArea = {
  get: (keys: string | string[]) => Promise<Record<string, unknown>> | void;
  set: (items: Record<string, unknown>) => Promise<void> | void;
};

type GeminiConfigRecord = GeminiConfig & {
  updatedAt: string;
};

const defaultConfig: GeminiConfig = {
  endpointUrl: "",
  modelId: ""
};

const memoryStore: { data: GeminiConfig } = { data: defaultConfig };

const getStorageArea = (): StorageArea | null => {
  const chromeRef = (globalThis as { chrome?: { storage?: { local?: StorageArea } } }).chrome;
  return chromeRef?.storage?.local ?? null;
};

const readFromChrome = async (storage: StorageArea): Promise<Record<string, unknown>> => {
  return await new Promise((resolve) => {
    try {
      const result = storage.get([GEMINI_CONFIG_KEY]);
      if (result && typeof (result as Promise<Record<string, unknown>>).then === "function") {
        (result as Promise<Record<string, unknown>>)
          .then(resolve)
          .catch(() => resolve({}));
      } else {
        (
          storage as unknown as {
            get: (keys: string[], cb: (items: Record<string, unknown>) => void) => void;
          }
        ).get([GEMINI_CONFIG_KEY], (items) => resolve(items));
      }
    } catch {
      resolve({});
    }
  });
};

const writeToChrome = async (storage: StorageArea, payload: GeminiConfigRecord): Promise<void> => {
  await new Promise((resolve) => {
    try {
      const result = storage.set({ [GEMINI_CONFIG_KEY]: payload });
      if (result && typeof (result as Promise<void>).then === "function") {
        (result as Promise<void>).then(() => resolve(undefined)).catch(() => resolve(undefined));
      } else {
        (
          storage as unknown as {
            set: (items: Record<string, unknown>, cb: () => void) => void;
          }
        ).set({ [GEMINI_CONFIG_KEY]: payload }, () => resolve(undefined));
      }
    } catch {
      resolve(undefined);
    }
  });
};

const parseConfig = (input: unknown): GeminiConfig => {
  if (!input || typeof input !== "object") {
    return defaultConfig;
  }

  const endpointUrlRaw = (input as { endpointUrl?: unknown }).endpointUrl;
  const modelIdRaw = (input as { modelId?: unknown }).modelId;

  return {
    endpointUrl: typeof endpointUrlRaw === "string" ? endpointUrlRaw : "",
    modelId: typeof modelIdRaw === "string" ? modelIdRaw : ""
  };
};

export const normalizeGeminiEndpointUrl = (value: string): string => {
  return value.trim().replace(/\/+$/, "");
};

export const isValidGeminiEndpointUrl = (value: string): boolean => {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
};

export const readGeminiConfig = async (): Promise<GeminiConfig> => {
  const storage = getStorageArea();
  if (!storage) {
    return memoryStore.data;
  }

  const result = await readFromChrome(storage);
  return parseConfig(result[GEMINI_CONFIG_KEY]);
};

export const writeGeminiConfig = async (config: GeminiConfig): Promise<void> => {
  const payload: GeminiConfigRecord = {
    endpointUrl: config.endpointUrl,
    modelId: config.modelId,
    updatedAt: new Date().toISOString()
  };

  const storage = getStorageArea();
  if (!storage) {
    memoryStore.data = { endpointUrl: config.endpointUrl, modelId: config.modelId };
    return;
  }

  await writeToChrome(storage, payload);
};

export const updateGeminiConfig = async (update: Partial<GeminiConfig>): Promise<GeminiConfig> => {
  const current = await readGeminiConfig();
  const next: GeminiConfig = {
    endpointUrl: typeof update.endpointUrl === "string" ? update.endpointUrl : current.endpointUrl,
    modelId: typeof update.modelId === "string" ? update.modelId : current.modelId
  };

  await writeGeminiConfig(next);
  return next;
};

export const clearGeminiConfig = async (): Promise<void> => {
  await writeGeminiConfig(defaultConfig);
};

export const getGeminiConfig = async (): Promise<GeminiConfig | null> => {
  const config = await readGeminiConfig();
  const endpointUrl = normalizeGeminiEndpointUrl(config.endpointUrl);
  const modelId = config.modelId.trim();

  if (!endpointUrl || !modelId) {
    return null;
  }

  if (!isValidGeminiEndpointUrl(endpointUrl)) {
    return null;
  }

  return { endpointUrl, modelId };
};

export const isGeminiConfigured = async (): Promise<boolean> => {
  return (await getGeminiConfig()) != null;
};
