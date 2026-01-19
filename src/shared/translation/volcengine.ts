export const VOLCENGINE_CONFIG_KEY = "wordmark:translation:volcengine";

export type VolcengineConfig = {
  endpointUrl: string;
  modelId: string;
};

type StorageArea = {
  get: (keys: string | string[]) => Promise<Record<string, unknown>> | void;
  set: (items: Record<string, unknown>) => Promise<void> | void;
};

type VolcengineConfigRecord = VolcengineConfig & {
  updatedAt: string;
};

const defaultConfig: VolcengineConfig = {
  endpointUrl: "",
  modelId: ""
};

const memoryStore: { data: VolcengineConfig } = { data: defaultConfig };

const getStorageArea = (): StorageArea | null => {
  const chromeRef = (globalThis as { chrome?: { storage?: { local?: StorageArea } } }).chrome;
  return chromeRef?.storage?.local ?? null;
};

const readFromChrome = async (storage: StorageArea): Promise<Record<string, unknown>> => {
  return await new Promise((resolve) => {
    try {
      const result = storage.get([VOLCENGINE_CONFIG_KEY]);
      if (result && typeof (result as Promise<Record<string, unknown>>).then === "function") {
        (result as Promise<Record<string, unknown>>)
          .then(resolve)
          .catch(() => resolve({}));
      } else {
        (
          storage as unknown as {
            get: (keys: string[], cb: (items: Record<string, unknown>) => void) => void;
          }
        ).get([VOLCENGINE_CONFIG_KEY], (items) => resolve(items));
      }
    } catch {
      resolve({});
    }
  });
};

const writeToChrome = async (storage: StorageArea, payload: VolcengineConfigRecord): Promise<void> => {
  await new Promise((resolve) => {
    try {
      const result = storage.set({ [VOLCENGINE_CONFIG_KEY]: payload });
      if (result && typeof (result as Promise<void>).then === "function") {
        (result as Promise<void>).then(() => resolve(undefined)).catch(() => resolve(undefined));
      } else {
        (
          storage as unknown as {
            set: (items: Record<string, unknown>, cb: () => void) => void;
          }
        ).set({ [VOLCENGINE_CONFIG_KEY]: payload }, () => resolve(undefined));
      }
    } catch {
      resolve(undefined);
    }
  });
};

const parseConfig = (input: unknown): VolcengineConfig => {
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

export const readVolcengineConfig = async (): Promise<VolcengineConfig> => {
  const storage = getStorageArea();
  if (!storage) {
    return memoryStore.data;
  }

  const result = await readFromChrome(storage);
  return parseConfig(result[VOLCENGINE_CONFIG_KEY]);
};

export const writeVolcengineConfig = async (config: VolcengineConfig): Promise<void> => {
  const payload: VolcengineConfigRecord = {
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

export const updateVolcengineConfig = async (update: Partial<VolcengineConfig>): Promise<VolcengineConfig> => {
  const current = await readVolcengineConfig();
  const next: VolcengineConfig = {
    endpointUrl: typeof update.endpointUrl === "string" ? update.endpointUrl : current.endpointUrl,
    modelId: typeof update.modelId === "string" ? update.modelId : current.modelId
  };

  await writeVolcengineConfig(next);
  return next;
};

export const clearVolcengineConfig = async (): Promise<void> => {
  await writeVolcengineConfig(defaultConfig);
};

export const getVolcengineConfig = async (): Promise<VolcengineConfig | null> => {
  const config = await readVolcengineConfig();
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

export const isVolcengineConfigured = async (): Promise<boolean> => {
  return (await getVolcengineConfig()) != null;
};
