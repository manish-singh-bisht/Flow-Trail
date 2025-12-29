import type { FlowType } from './types.js';
import { Flow } from './flow.js';

// Type exports
export type {
  FlowType,
  StepType,
  ObservationType,
  FlowPayload,
  StepStatusType,
} from './types.js';


export function createFlow(name: FlowType['name']): Flow {
  return new Flow(name);
}