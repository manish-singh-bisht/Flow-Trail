import { Redis } from 'ioredis';
import { env } from '../config/env.js';

let queueConnection: Redis | null = null;

export function getQueueConnection(): Redis {
  if (!queueConnection) {
    queueConnection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    queueConnection.on('error', (err) => {
      console.error('Redis Queue connection error:', err);
    });

    queueConnection.on('connect', () => {
      console.log('✅ Redis Queue connected');
    });
  }
  return queueConnection;
}

export async function closeQueueConnection(): Promise<void> {
  if (queueConnection) {
    await queueConnection.quit();
    queueConnection = null;
  }
}
