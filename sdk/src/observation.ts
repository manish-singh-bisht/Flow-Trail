import { ObservationSchema, type ObservationType } from '@flow-trail/shared';
import { calculateSize, validateObservationSize } from './utils.js';

export class Observation {
  public readonly name: ObservationType['name'];
  public readonly step: ObservationType['step'];
  public readonly queryable: ObservationType['queryable'];
  public readonly data: ObservationType['data'];
  public readonly version: ObservationType['version']; // version for this observation

  constructor(options: ObservationType) {
    const validated = ObservationSchema.parse(options);

    this.name = validated.name;
    this.step = validated.step;
    this.queryable = validated.queryable;
    this.data = validated.data;
    this.version = validated.version;

    const size = calculateSize(validated.data);
    validateObservationSize(size);
  }

  // todo: make an api that masks PII data
}
