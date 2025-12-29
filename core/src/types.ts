import { z } from 'zod';

export const StepStatusSchema = z.enum(['pending', 'running', 'completed', 'failed']);

export type StepStatusType = z.infer<typeof StepStatusSchema>;

export const FlowSchema = z.object({
  name: z.string().min(1, 'Flow name is required'),
  createdAt: z.date(),
  finishedAt: z.date().nullable(),
});

export type FlowType = z.infer<typeof FlowSchema>;

export const ObservationSchema = z.object({
  name: z.string().min(1, 'Record name is required'),
  version: z.number().int().positive('Version must be a positive integer'),
  step: z.string().min(1, 'Step name is required'),
  queryable: z
    .record(z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()])
    )
    .nullable()
    .optional(),
  data: z.any(),
});

export type ObservationType = z.infer<typeof ObservationSchema>;

export const StepSchema = z.object({
  name: z.string().min(1, 'Step name is required'),
  version: z.number().int().positive('Version must be a positive integer'),
  flow: z.string().min(1, 'Flow name is required'),
  createdAt: z.date(),
  parentStep: z.string().nullable(),
  position: z.number().int().nonnegative('Position must be non-negative'),
  status: StepStatusSchema,
  reason: z.string(),
  startedAt: z.date().nullable(),
  finishedAt: z.date().nullable(),
  observations: z.array(ObservationSchema),
});

export type StepType = z.infer<typeof StepSchema>;

export const FlowPayloadSchema = z.object({
  flow: FlowSchema,
  steps: z.array(StepSchema),
});

export type FlowPayload = z.infer<typeof FlowPayloadSchema>;

export const TransportOptionsSchema = z.object({
  timeout: z.number().int().positive('Timeout must be a positive integer').optional().default(10000),
  maxRetries: z.number().int().positive('Max retries must be a positive integer').optional().default(3),
  retryDelay: (z.number().int().positive('Retry delay must be a positive integer')).optional().default(500),
});

export type TransportOptions = z.infer<typeof TransportOptionsSchema>;