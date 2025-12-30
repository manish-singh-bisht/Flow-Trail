import { Worker } from 'bullmq';
import type { FlowJobData, FlowJobResult } from '../types/flow-processing.js';
import { processFlow } from '../../services/flow.js';
import { FlowPayloadSchema } from '@flow-trail/shared';
import { getRedisClient } from '../../redis/client.js';

let flowWorker: Worker<FlowJobData, FlowJobResult> | null = null;

export async function startFlowWorker(): Promise<void> {
  flowWorker = new Worker<FlowJobData, FlowJobResult>(
    'process-flow',
    async (job) => {
      const { payload, idempotencyKey } = job.data;

      console.log(`Processing flow: ${payload.flow.name} (job: ${job.id})`);

      const result = await processFlow(payload, idempotencyKey);

      console.log(`Flow processed: ${payload.flow.name} (job: ${job.id})`);

      return result;
    },
    {
      connection: getRedisClient(),
      concurrency: 5,
      limiter: {
        max: 100,
        duration: 1000,
      },
    }
  );

  flowWorker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  flowWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  flowWorker.on('error', (err) => {
    console.error('Worker error:', err);
  });

  flowWorker.on('stalled', (jobId) => {
    console.warn(`Job ${jobId} stalled`);
  });
}

export async function closeFlowWorker(): Promise<void> {
  if (!flowWorker) {
    return;
  }

  await flowWorker.close();
  flowWorker = null;
}
