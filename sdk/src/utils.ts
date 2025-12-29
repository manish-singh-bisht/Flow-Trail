export function calculateSize(data: unknown): number {
    if (typeof data !== 'object' || data === null) {
        throw new Error('Data must be an object');
    }
    const stringified = JSON.stringify(data);
    return new TextEncoder().encode(stringified).length;
}
  
export function validateObservationSize(size: number): void {
    const MAX_SIZE = 10 * 1024 * 1024;
    if (size > MAX_SIZE) {
      throw new Error(
        `Record size ${size} bytes exceeds maximum of ${MAX_SIZE} bytes (10MB)`
      );
    }
  }
  

export async function exponentialBackoff(
    delay: number,
    maxRetries: number,
    fn: () => Promise<void>
): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error(`Max retries (${maxRetries}) reached. Last error: ${error}`);
        }

        const baseDelay = Math.pow(2, i) * delay;
        const jitter = baseDelay * 0.2 * Math.random();
        const finalWaitTime = baseDelay + jitter;

        await new Promise((resolve) => setTimeout(resolve, finalWaitTime));
      }
    }
}
