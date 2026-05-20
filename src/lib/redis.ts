import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const client = createClient({
  url: redisUrl,
});

client.on('error', (err: any) => console.log('Redis Client Error', err));

let isConnected = false;

export async function getRedisClient() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
  }
  return client;
}

export async function cacheJDAnalysis(jdId: string, analysis: any) {
  const redis = await getRedisClient();
  await redis.set(`jd_analysis:${jdId}`, JSON.stringify(analysis), {
    EX: 3600 * 24, // Cache for 24 hours
  });
}

export async function getCachedJDAnalysis(jdId: string) {
  const redis = await getRedisClient();
  const data = await redis.get(`jd_analysis:${jdId}`);
  return data ? JSON.parse(data) : null;
}
