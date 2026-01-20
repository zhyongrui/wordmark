export const ZHIPU_CONFIG_KEY = "wordmark:translation:zhipu";

export type ZhipuConfig = {
  endpointUrl: string;
  modelId: string;
};

type StorageArea = {
  get: (keys: string | string[]) => Promise<Record<string, unknown>> | void;
  set: (items: Record<string, unknown>) => Promise<void> | void;
};

type ZhipuConfigRecord = ZhipuConfig & {
  updatedAt: string;
};

const defaultConfig: ZhipuConfig = {
  endpointUrl: "",
  modelId: ""
};

const memoryStore: { data: ZhipuConfig } = { data: defaultConfig };

const getStorageArea = (): StorageArea | null => {
  const chromeRef = (globalThis as { chrome?: { storage?: { local?: StorageArea } } }).chrome;
  return chromeRef?.storage?.local ?? null;
};

const readFromChrome = async (storage: StorageArea): Promise<Record<string, unknown>> => {
  return await new Promise((resolve) => {
    try {
      const result = storage.get([ZHIPU_CONFIG_KEY]);
      if (result && typeof (result as Promise<Record<string, unknown>>).then === "function") {
        (result as Promise<Record<string, unknown>>)
          .then(resolve)
          .catch(() => resolve({}));
      } else {
        (
          storage as unknown as {
            get: (keys: string[], cb: (items: Record<string, unknown>) => void) => void;
          }
        ).get([ZHIPU_CONFIG_KEY], (items) => resolve(items));
      }
    } catch {
      resolve({});
    }
  });
};

const writeToChrome = async (storage: StorageArea, payload: ZhipuConfigRecord): Promise<void> => {
  await new Promise((resolve) => {
    try {
      const result = storage.set({ [ZHIPU_CONFIG_KEY]: payload });
      if (result && typeof (result as Promise<void>).then === "function") {
        (result as Promise<void>).then(() => resolve(undefined)).catch(() => resolve(undefined));
      } else {
        (
          storage as unknown as {
            set: (items: Record<string, unknown>, cb: () => void) => void;
          }
        ).set({ [ZHIPU_CONFIG_KEY]: payload }, () => resolve(undefined));
      }
    } catch {
      resolve(undefined);
    }
  });
};

const parseConfig = (input: unknown): ZhipuConfig => {
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

export const readZhipuConfig = async (): Promise<ZhipuConfig> => {
  const storage = getStorageArea();
  if (!storage) {
    return memoryStore.data;
  }

  const result = await readFromChrome(storage);
  return parseConfig(result[ZHIPU_CONFIG_KEY]);
};

export const writeZhipuConfig = async (config: ZhipuConfig): Promise<void> => {
  const payload: ZhipuConfigRecord = {
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

export const updateZhipuConfig = async (update: Partial<ZhipuConfig>): Promise<ZhipuConfig> => {
  const current = await readZhipuConfig();
  const next: ZhipuConfig = {
    endpointUrl: typeof update.endpointUrl === "string" ? update.endpointUrl : current.endpointUrl,
    modelId: typeof update.modelId === "string" ? update.modelId : current.modelId
  };

  await writeZhipuConfig(next);
  return next;
};

export const clearZhipuConfig = async (): Promise<void> => {
  await writeZhipuConfig(defaultConfig);
};

export const getZhipuConfig = async (): Promise<ZhipuConfig | null> => {
  const config = await readZhipuConfig();
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

export const isZhipuConfigured = async (): Promise<boolean> => {
  return (await getZhipuConfig()) != null;
};
