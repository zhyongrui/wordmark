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
