import { TransportOptionsSchema, type FlowPayload, type TransportOptions } from './types.js';
import { exponentialBackoff } from './utils.js';

export class Transport {
  private readonly baseUrl: string = 'http://localhost:3000';

  public readonly timeout: TransportOptions['timeout'];
  public readonly maxRetries: TransportOptions['maxRetries'];
  public readonly retryDelay: TransportOptions['retryDelay'];

  constructor(options?: TransportOptions) {
    const validated = TransportOptionsSchema.parse(options);

    this.timeout = validated.timeout;
    this.maxRetries = validated.maxRetries;
    this.retryDelay = validated.retryDelay;
  }

  // TODO: send via http stream to reduce chances of failure for high size payloads
  async send(payload: FlowPayload): Promise<void> {
    await exponentialBackoff(this.retryDelay, this.maxRetries, async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/flows`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'idempotency-key': crypto.randomUUID(), // idempotency key to prevent duplicate requests
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Failed to send flow: ${response.statusText}`);
        }
      } catch (error) {
        throw new Error(`Failed to send flow: ${error}`);
      }
    });
  }
}
