export const DEEPSEEK_CONFIG_KEY = 'wordmark:translation:deepseek';

export type DeepSeekConfig = {
  endpointUrl: string;
  modelId: string;
};

type StorageArea = {
  get: (keys: string | string[]) => Promise<Record<string, unknown>> | void;
  set: (items: Record<string, unknown>) => Promise<void> | void;
};

type DeepSeekConfigRecord = DeepSeekConfig & {
  updatedAt: string;
};

const defaultConfig: DeepSeekConfig = {
  endpointUrl: '',
  modelId: '',
};

const memoryStore: { data: DeepSeekConfig } = { data: defaultConfig };

const getStorageArea = (): StorageArea | null => {
  const chromeRef = (globalThis as { chrome?: { storage?: { local?: StorageArea } } }).chrome;
  return chromeRef?.storage?.local ?? null;
};

const readFromChrome = async (storage: StorageArea): Promise<Record<string, unknown>> => {
  return await new Promise((resolve) => {
    try {
      const result = storage.get([DEEPSEEK_CONFIG_KEY]);
      if (result && typeof (result as Promise<Record<string, unknown>>).then === 'function') {
        (result as Promise<Record<string, unknown>>)
          .then(resolve)
          .catch(() => resolve({}));
      } else {
        (
          storage as unknown as {
            get: (keys: string[], cb: (items: Record<string, unknown>) => void) => void;
          }
        ).get([DEEPSEEK_CONFIG_KEY], (items) => resolve(items));
      }
    } catch {
      resolve({});
    }
  });
};

const writeToChrome = async (storage: StorageArea, payload: DeepSeekConfigRecord): Promise<void> => {
  await new Promise((resolve) => {
    try {
      const result = storage.set({ [DEEPSEEK_CONFIG_KEY]: payload });
      if (result && typeof (result as Promise<void>).then === 'function') {
        (result as Promise<void>).then(() => resolve(undefined)).catch(() => resolve(undefined));
      } else {
        (
          storage as unknown as {
            set: (items: Record<string, unknown>, cb: () => void) => void;
          }
        ).set({ [DEEPSEEK_CONFIG_KEY]: payload }, () => resolve(undefined));
      }
    } catch {
      resolve(undefined);
    }
  });
};

const parseConfig = (input: unknown): DeepSeekConfig => {
  if (!input || typeof input !== 'object') {
    return defaultConfig;
  }

  const endpointUrlRaw = (input as { endpointUrl?: unknown }).endpointUrl;
  const modelIdRaw = (input as { modelId?: unknown }).modelId;

  return {
    endpointUrl: typeof endpointUrlRaw === 'string' ? endpointUrlRaw : '',
    modelId: typeof modelIdRaw === 'string' ? modelIdRaw : '',
  };
};

export const normalizeDeepSeekEndpointUrl = (value: string): string => {
  return value.trim().replace(/\/+$/, '');
};

export const isValidDeepSeekEndpointUrl = (value: string): boolean => {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const readDeepSeekConfig = async (): Promise<DeepSeekConfig> => {
  const storage = getStorageArea();
  if (!storage) {
    return memoryStore.data;
  }

  const result = await readFromChrome(storage);
  return parseConfig(result[DEEPSEEK_CONFIG_KEY]);
};

export const writeDeepSeekConfig = async (config: DeepSeekConfig): Promise<void> => {
  const payload: DeepSeekConfigRecord = {
    endpointUrl: config.endpointUrl,
    modelId: config.modelId,
    updatedAt: new Date().toISOString(),
  };

  const storage = getStorageArea();
  if (!storage) {
    memoryStore.data = { endpointUrl: config.endpointUrl, modelId: config.modelId };
    return;
  }

  await writeToChrome(storage, payload);
};

export const updateDeepSeekConfig = async (update: Partial<DeepSeekConfig>): Promise<DeepSeekConfig> => {
  const current = await readDeepSeekConfig();
  const next: DeepSeekConfig = {
    endpointUrl: typeof update.endpointUrl === 'string' ? update.endpointUrl : current.endpointUrl,
    modelId: typeof update.modelId === 'string' ? update.modelId : current.modelId,
  };

  await writeDeepSeekConfig(next);
  return next;
};

export const clearDeepSeekConfig = async (): Promise<void> => {
  await writeDeepSeekConfig(defaultConfig);
};

export const getDeepSeekConfig = async (): Promise<DeepSeekConfig | null> => {
  const config = await readDeepSeekConfig();
  const endpointUrl = normalizeDeepSeekEndpointUrl(config.endpointUrl);
  const modelId = config.modelId.trim();

  if (!endpointUrl || !modelId) {
    return null;
  }

  if (!isValidDeepSeekEndpointUrl(endpointUrl)) {
    return null;
  }

  return { endpointUrl, modelId };
};

export const isDeepSeekConfigured = async (): Promise<boolean> => {
  return (await getDeepSeekConfig()) != null;
};

