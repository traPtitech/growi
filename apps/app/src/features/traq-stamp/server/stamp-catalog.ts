import loggerFactory from '~/utils/logger';

import type { TraqStampConfig } from '../types';

const logger = loggerFactory('growi:traq-stamp');
const REFRESH_INTERVAL = 5 * 60 * 1000;
const RETRY_INTERVAL = 60 * 1000;

type CatalogCache = {
  config: TraqStampConfig;
  refreshAt: number;
  pending?: Promise<TraqStampConfig>;
};

const caches = new Map<string, CatalogCache>();

export const getTraqStampOrigin = (): string | undefined => {
  if ((process.env.TRAQ_STAMPS_ENABLED ?? process.env.TRAQ_ENABLED) !== 'true')
    return undefined;
  const url = new URL(process.env.TRAQ_ISSUER_HOST || 'https://q.trap.jp');
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error(
      'traQ stamp origin must be an HTTP(S) URL without credentials',
    );
  }
  return url.origin;
};

const fetchCatalog = async (entry: CatalogCache): Promise<TraqStampConfig> => {
  const { origin } = entry.config;
  try {
    const response = await fetch(`${origin}/api/1.0/public/emoji.json`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: unknown = await response.json();
    if (data == null || typeof data !== 'object' || Array.isArray(data))
      throw new Error('Invalid stamp catalog');
    const groups: unknown[] = Object.values(data);
    if (
      !groups.every(
        (group) =>
          Array.isArray(group) &&
          group.every((name) => typeof name === 'string'),
      )
    ) {
      throw new Error('Invalid stamp catalog');
    }
    const names = groups
      .flat()
      .filter(
        (name): name is string =>
          typeof name === 'string' && /^[a-zA-Z0-9+_-]{1,32}$/.test(name),
      );
    if (names.length === 0) throw new Error('Empty stamp catalog');
    entry.config = { origin, names: [...new Set(names)] };
    entry.refreshAt = Date.now() + REFRESH_INTERVAL;
  } catch (error) {
    logger.warn(
      { err: error },
      'Could not refresh traQ stamps; keeping the previous catalog',
    );
    entry.refreshAt = Date.now() + RETRY_INTERVAL;
  }
  return entry.config;
};

export const getTraqStampConfig = async (): Promise<
  TraqStampConfig | undefined
> => {
  const origin = getTraqStampOrigin();
  if (origin == null) return undefined;
  let entry = caches.get(origin);
  if (entry == null) {
    entry = { config: { origin, names: [] }, refreshAt: 0 };
    caches.set(origin, entry);
  }
  if (Date.now() < entry.refreshAt) return entry.config;
  const current = entry;
  current.pending ??= fetchCatalog(current).finally(() => {
    current.pending = undefined;
  });
  return current.pending;
};
