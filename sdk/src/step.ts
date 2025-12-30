import {
  StepSchema,
  StepStatusSchema,
  type StepType,
  type ObservationType,
} from '@flow-trail/shared';
import { Observation } from './observation.js';

export class Step {
  public readonly name: StepType['name'];
  public readonly flow: StepType['flow'];
  public readonly createdAt: StepType['createdAt'];
  public readonly position: StepType['position'];
  public readonly version: StepType['version']; // version for this step, eg: say for LLM step if it retries then we should also show the previous version of the step

  private _status: StepType['status'];
  private _reason: StepType['reason'] = '';
  private _startedAt: StepType['startedAt'] = null;
  private _finishedAt: StepType['finishedAt'] = null;
  private readonly _observations: StepType['observations'] = [];
  private readonly _observationVersionMap = new Map<string, number>();

  constructor(options: StepType) {
    const validated = StepSchema.parse(options);

    this.name = validated.name;
    this.flow = validated.flow;
    this.position = validated.position;
    this.version = validated.version;
    this.createdAt = validated.createdAt;
    this._status = validated.status;
    this._reason = validated.reason;
    this._startedAt = validated.startedAt;
  }

  get observations(): ObservationType[] {
    return this._observations;
  }

  get status(): StepType['status'] {
    return this._status;
  }

  get reason(): StepType['reason'] {
    return this._reason;
  }

  get startedAt(): StepType['startedAt'] {
    return this._startedAt;
  }

  get finishedAt(): StepType['finishedAt'] {
    return this._finishedAt;
  }

  capture({
    name,
    data,
    queryable,
  }: {
    name: ObservationType['name'];
    data: ObservationType['data'];
    queryable?: ObservationType['queryable'];
  }): Observation {
    const currentVersion = this._observationVersionMap.get(name) ?? 0;
    const newVersion = currentVersion + 1;
    this._observationVersionMap.set(name, newVersion);

    const observation = new Observation({
      name,
      data,
      queryable,
      step: this.name,
      version: newVersion,
    });
    this._observations.push(observation);
    return observation;
  }

  finish({ status, reason }: { status: StepType['status']; reason: StepType['reason'] }): void {
    // idempotency check
    if (this._finishedAt) {
      return;
    }

    this._status = StepStatusSchema.parse(status);
    this._reason = reason;
    this._finishedAt = new Date();
  }
}
