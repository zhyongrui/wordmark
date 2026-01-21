import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearDeepSeekConfig,
  getDeepSeekConfig,
  normalizeDeepSeekEndpointUrl,
  writeDeepSeekConfig,
} from '../../../src/shared/translation/deepseek';

const installMockChromeStorage = () => {
  const data: Record<string, unknown> = {};

  const local = {
    get: vi.fn(async (keys: string | string[]) => {
      const requestedKeys = Array.isArray(keys) ? keys : [keys];
      const result: Record<string, unknown> = {};
      for (const key of requestedKeys) {
        result[key] = data[key];
      }
      return result;
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      Object.assign(data, items);
    }),
  };

  vi.stubGlobal('chrome', { storage: { local } });
  return { data, local };
};

describe('deepseek config helpers', () => {
  beforeEach(() => {
    installMockChromeStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes endpoint URLs by trimming trailing slashes', () => {
    expect(normalizeDeepSeekEndpointUrl(' https://example.com/// ')).toBe('https://example.com');
  });

  it('returns null when config is missing required fields', async () => {
    await clearDeepSeekConfig();
    expect(await getDeepSeekConfig()).toBeNull();
  });

  it('returns null for non-https endpoints', async () => {
    await writeDeepSeekConfig({ endpointUrl: 'http://example.com/chat/completions', modelId: 'k' });
    expect(await getDeepSeekConfig()).toBeNull();
  });

  it('returns normalized config when valid', async () => {
    await writeDeepSeekConfig({
      endpointUrl: 'https://example.com/chat/completions/',
      modelId: 'deepseek-chat',
    });
    expect(await getDeepSeekConfig()).toEqual({
      endpointUrl: 'https://example.com/chat/completions',
      modelId: 'deepseek-chat',
    });
  });
});

