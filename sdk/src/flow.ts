import {
  FlowPayloadSchema,
  type FlowType,
  type StepType,
  type FlowPayload,
  StepStatusSchema,
} from '@flow-trail/shared';
import { Step } from './step.js';
import { Transport } from './transport.js';

export class Flow {
  public readonly name: FlowType['name'];
  public readonly createdAt: FlowType['createdAt'] = new Date();

  private _finishedAt: FlowType['finishedAt'] = null;
  private readonly _steps: StepType[] = [];

  // TODO: get transport config from users
  private readonly transport: Transport = new Transport();
  private readonly stepVersionMap = new Map<string, number>();

  constructor(name: FlowType['name']) {
    this.name = name;
  }

  createStep(name: StepType['name']): Step {
    const position = this._steps.length;
    const currentVersion = this.stepVersionMap.get(name) ?? 0;
    const newVersion = currentVersion + 1;
    this.stepVersionMap.set(name, newVersion);

    const step = new Step({
      name,
      version: newVersion,
      flow: this.name,
      position,
      status: StepStatusSchema.parse('running'),
      reason: '',
      createdAt: new Date(),
      startedAt: new Date(),
      finishedAt: null,
      observations: [],
    });

    this._steps.push(step);
    return step;
  }

  async finish(): Promise<void> {
    // prevents against invoking finish multiple times
    if (this._finishedAt) {
      throw new Error('Flow already finished');
    }

    this._finishedAt = new Date();

    const payload: FlowPayload = FlowPayloadSchema.parse({
      flow: {
        name: this.name,
        createdAt: this.createdAt,
        finishedAt: this._finishedAt,
      },
      steps: this._steps.map((step) => ({
        name: step.name,
        version: step.version,
        flow: step.flow,
        createdAt: step.createdAt,
        position: step.position,
        status: step.status,
        reason: step.reason,
        startedAt: step.startedAt,
        finishedAt: step.finishedAt,
        observations: step.observations.map((obs) => ({
          name: obs.name,
          step: obs.step,
          queryable: obs.queryable,
          data: obs.data,
          version: obs.version,
        })),
      })),
    });

    await this.transport.send(payload);
  }
}
