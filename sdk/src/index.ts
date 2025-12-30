import type { FlowType } from '@flow-trail/shared';
import { Flow } from './flow.js';

// Type exports
export type {
  FlowType,
  StepType,
  ObservationType,
  FlowPayload,
  StepStatusType,
} from '@flow-trail/shared';

export function createFlow(name: FlowType['name']): Flow {
  return new Flow(name);
}
