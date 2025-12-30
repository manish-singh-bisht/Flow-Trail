import { Queue } from 'bullmq';
import type { FlowPayload } from '@flow-trail/shared';
import type { FlowJobData } from '../types/flow-processing.js';
import { getRedisClient } from '../../redis/client.js';

export const flowQueue = new Queue('flow-processing', {
  connection: getRedisClient(),
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 1000,
    },
    removeOnFail: {
      count: 5000,
    },
  },
});

// this idempotency key is used to prevent duplicate requests due to say network retries
// idempotency check at queue level helps in prevention of race conditions when two request of same key are processed concurrently
export async function addFlowToQueue(payload: FlowPayload, idempotencyKey: string): Promise<void> {
  const jobData = { payload, idempotencyKey };

  const jobId = `${payload.flow.name}-${idempotencyKey}`;
  await flowQueue.add('process-flow', jobData, {
    jobId,
  });

  console.log(`Flow "${payload.flow.name}" added to queue (job: ${jobId})`);
}

export async function closeFlowQueue(): Promise<void> {
  await flowQueue.close();
}
