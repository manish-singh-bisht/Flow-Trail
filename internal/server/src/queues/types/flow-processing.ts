import type { FlowPayload } from '@flow-trail/shared';

export interface FlowJobData {
  payload: FlowPayload;
  idempotencyKey: string;
}

export interface FlowJobResult {
  success: boolean;
  flowId?: string;
  error?: string;
}
