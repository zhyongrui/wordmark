export const QWEN_CONFIG_KEY = "wordmark:translation:qwen";

export type QwenConfig = {
  endpointUrl: string;
  modelId: string;
};

type StorageArea = {
  get: (keys: string | string[]) => Promise<Record<string, unknown>> | void;
  set: (items: Record<string, unknown>) => Promise<void> | void;
};

type QwenConfigRecord = QwenConfig & {
  updatedAt: string;
};

const defaultConfig: QwenConfig = {
  endpointUrl: "",
  modelId: ""
};

const memoryStore: { data: QwenConfig } = { data: defaultConfig };

const getStorageArea = (): StorageArea | null => {
  const chromeRef = (globalThis as { chrome?: { storage?: { local?: StorageArea } } }).chrome;
  return chromeRef?.storage?.local ?? null;
};

const readFromChrome = async (storage: StorageArea): Promise<Record<string, unknown>> => {
  return await new Promise((resolve) => {
    try {
      const result = storage.get([QWEN_CONFIG_KEY]);
      if (result && typeof (result as Promise<Record<string, unknown>>).then === "function") {
        (result as Promise<Record<string, unknown>>)
          .then(resolve)
          .catch(() => resolve({}));
      } else {
        (
          storage as unknown as {
            get: (keys: string[], cb: (items: Record<string, unknown>) => void) => void;
          }
        ).get([QWEN_CONFIG_KEY], (items) => resolve(items));
      }
    } catch {
      resolve({});
    }
  });
};

const writeToChrome = async (storage: StorageArea, payload: QwenConfigRecord): Promise<void> => {
  await new Promise((resolve) => {
    try {
      const result = storage.set({ [QWEN_CONFIG_KEY]: payload });
      if (result && typeof (result as Promise<void>).then === "function") {
        (result as Promise<void>).then(() => resolve(undefined)).catch(() => resolve(undefined));
      } else {
        (
          storage as unknown as {
            set: (items: Record<string, unknown>, cb: () => void) => void;
          }
        ).set({ [QWEN_CONFIG_KEY]: payload }, () => resolve(undefined));
      }
    } catch {
      resolve(undefined);
    }
  });
};

const parseConfig = (input: unknown): QwenConfig => {
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

const normalizeEndpointUrl = (value: string): string => {
  return value.trim().replace(/\/+$/, "");
};

const isValidEndpointUrl = (value: string): boolean => {
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

export const readQwenConfig = async (): Promise<QwenConfig> => {
  const storage = getStorageArea();
  if (!storage) {
    return memoryStore.data;
  }

  const result = await readFromChrome(storage);
  return parseConfig(result[QWEN_CONFIG_KEY]);
};

export const writeQwenConfig = async (config: QwenConfig): Promise<void> => {
  const payload: QwenConfigRecord = {
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

export const updateQwenConfig = async (update: Partial<QwenConfig>): Promise<QwenConfig> => {
  const current = await readQwenConfig();
  const next: QwenConfig = {
    endpointUrl: typeof update.endpointUrl === "string" ? update.endpointUrl : current.endpointUrl,
    modelId: typeof update.modelId === "string" ? update.modelId : current.modelId
  };

  await writeQwenConfig(next);
  return next;
};

export const clearQwenConfig = async (): Promise<void> => {
  await writeQwenConfig(defaultConfig);
};

export const getQwenConfig = async (): Promise<QwenConfig | null> => {
  const config = await readQwenConfig();
  const endpointUrl = normalizeEndpointUrl(config.endpointUrl);
  const modelId = config.modelId.trim();

  if (!endpointUrl || !modelId) {
    return null;
  }

  if (!isValidEndpointUrl(endpointUrl)) {
    return null;
  }

  return { endpointUrl, modelId };
};

export const isQwenConfigured = async (): Promise<boolean> => {
  return (await getQwenConfig()) != null;
};
