export const createInSessionDeduper = <T>() => {
  const inFlight = new Map<string, Promise<T>>();

  const dedupe = (key: string, factory: () => Promise<T>): Promise<T> => {
    const existing = inFlight.get(key);
    if (existing) {
      return existing;
    }

    const promise = (async () => await factory())();
    inFlight.set(key, promise);
    promise.finally(() => {
      if (inFlight.get(key) === promise) {
        inFlight.delete(key);
      }
    });
    return promise;
  };

  const clear = () => {
    inFlight.clear();
  };
  return { dedupe, clear };
};

export const createInMemoryTtlCache = <T>(options: { ttlMs: number; now?: () => number }) => {
  const now = options.now ?? (() => Date.now());
  const ttlMs = options.ttlMs;
  const entries = new Map<string, { value: T; expiresAt: number }>();

  const get = (key: string): T | null => {
    const entry = entries.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt <= now()) {
      entries.delete(key);
      return null;
    }
    return entry.value;
  };

  const set = (key: string, value: T) => {
    entries.set(key, { value, expiresAt: now() + ttlMs });
  };

  const clear = () => {
    entries.clear();
  };

  return { get, set, clear };
};
