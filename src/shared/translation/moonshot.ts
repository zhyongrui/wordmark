export const MOONSHOT_CONFIG_KEY = "wordmark:translation:moonshot";

export type MoonshotConfig = {
  endpointUrl: string;
  modelId: string;
};

type StorageArea = {
  get: (keys: string | string[]) => Promise<Record<string, unknown>> | void;
  set: (items: Record<string, unknown>) => Promise<void> | void;
};

type MoonshotConfigRecord = MoonshotConfig & {
  updatedAt: string;
};

const defaultConfig: MoonshotConfig = {
  endpointUrl: "",
  modelId: ""
};

const memoryStore: { data: MoonshotConfig } = { data: defaultConfig };

const getStorageArea = (): StorageArea | null => {
  const chromeRef = (globalThis as { chrome?: { storage?: { local?: StorageArea } } }).chrome;
  return chromeRef?.storage?.local ?? null;
};

const readFromChrome = async (storage: StorageArea): Promise<Record<string, unknown>> => {
  return await new Promise((resolve) => {
    try {
      const result = storage.get([MOONSHOT_CONFIG_KEY]);
      if (result && typeof (result as Promise<Record<string, unknown>>).then === "function") {
        (result as Promise<Record<string, unknown>>)
          .then(resolve)
          .catch(() => resolve({}));
      } else {
        (
          storage as unknown as {
            get: (keys: string[], cb: (items: Record<string, unknown>) => void) => void;
          }
        ).get([MOONSHOT_CONFIG_KEY], (items) => resolve(items));
      }
    } catch {
      resolve({});
    }
  });
};

const writeToChrome = async (storage: StorageArea, payload: MoonshotConfigRecord): Promise<void> => {
  await new Promise((resolve) => {
    try {
      const result = storage.set({ [MOONSHOT_CONFIG_KEY]: payload });
      if (result && typeof (result as Promise<void>).then === "function") {
        (result as Promise<void>).then(() => resolve(undefined)).catch(() => resolve(undefined));
      } else {
        (
          storage as unknown as {
            set: (items: Record<string, unknown>, cb: () => void) => void;
          }
        ).set({ [MOONSHOT_CONFIG_KEY]: payload }, () => resolve(undefined));
      }
    } catch {
      resolve(undefined);
    }
  });
};

const parseConfig = (input: unknown): MoonshotConfig => {
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

export const normalizeMoonshotEndpointUrl = (value: string): string => {
  return value.trim().replace(/\/+$/, "");
};

export const isValidMoonshotEndpointUrl = (value: string): boolean => {
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

export const readMoonshotConfig = async (): Promise<MoonshotConfig> => {
  const storage = getStorageArea();
  if (!storage) {
    return memoryStore.data;
  }

  const result = await readFromChrome(storage);
  return parseConfig(result[MOONSHOT_CONFIG_KEY]);
};

export const writeMoonshotConfig = async (config: MoonshotConfig): Promise<void> => {
  const payload: MoonshotConfigRecord = {
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

export const updateMoonshotConfig = async (update: Partial<MoonshotConfig>): Promise<MoonshotConfig> => {
  const current = await readMoonshotConfig();
  const next: MoonshotConfig = {
    endpointUrl: typeof update.endpointUrl === "string" ? update.endpointUrl : current.endpointUrl,
    modelId: typeof update.modelId === "string" ? update.modelId : current.modelId
  };

  await writeMoonshotConfig(next);
  return next;
};

export const clearMoonshotConfig = async (): Promise<void> => {
  await writeMoonshotConfig(defaultConfig);
};

export const getMoonshotConfig = async (): Promise<MoonshotConfig | null> => {
  const config = await readMoonshotConfig();
  const endpointUrl = normalizeMoonshotEndpointUrl(config.endpointUrl);
  const modelId = config.modelId.trim();

  if (!endpointUrl || !modelId) {
    return null;
  }

  if (!isValidMoonshotEndpointUrl(endpointUrl)) {
    return null;
  }

  return { endpointUrl, modelId };
};

export const isMoonshotConfigured = async (): Promise<boolean> => {
  return (await getMoonshotConfig()) != null;
};

