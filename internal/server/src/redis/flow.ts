import { getRedisClient } from './client.js';

const CACHE_TTL = 3600; // 1 hour
const CACHE_PREFIX = 'observation:';

// todo: add to util
function extractS3KeyFromUrl(s3Url: string): string {
  try {
    const url = new URL(s3Url);
    // Remove leading slash and bucket name from path
    const pathParts = url.pathname.split('/').filter(Boolean);
    // Skip the bucket name (first part)
    return pathParts.slice(1).join('/');
  } catch {
    const match = s3Url.match(/\/[^\/]+\/(.+)$/);
    return match?.[1] ?? s3Url;
  }
}

function getCacheKey(s3Url: string): string {
  const s3Key = extractS3KeyFromUrl(s3Url);
  return `${CACHE_PREFIX}${s3Key}`;
}

// todo: add retries
export async function getObservationData(
  s3Url: string,
  fetchFromS3: (key: string) => Promise<any>
): Promise<any> {
  const cache = getRedisClient();
  const cacheKey = getCacheKey(s3Url);
  const s3Key = extractS3KeyFromUrl(s3Url);

  const cached = await cache.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (error) {
      console.warn(`Failed to parse cached data for ${s3Url}:`, error);
    }
  }

  const data = await fetchFromS3(s3Key);

  try {
    await cache.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
  } catch (error) {
    console.warn(`Failed to cache data for ${s3Url}:`, error);
  }

  return data;
}

export async function invalidateObservationCache(s3Url: string): Promise<void> {
  const cache = getRedisClient();
  const cacheKey = getCacheKey(s3Url);
  await cache.del(cacheKey);
}
