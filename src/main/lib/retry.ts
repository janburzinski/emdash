import { log } from './logger';

export type RetryOptions = {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  signal?: AbortSignal;
};

export async function withRetry<T>(fn: () => Promise<T>, opts?: RetryOptions): Promise<T> {
  const { maxAttempts = 3, initialDelayMs = 1_000, maxDelayMs = 30_000 } = opts ?? {};

  let attempt = 0;
  let delay = initialDelayMs;

  for (;;) {
    try {
      return await fn();
    } catch (err: unknown) {
      attempt++;

      const status = (err as { status?: number })?.status;
      const isRetryable = status === undefined || status === 429 || status >= 500;

      if (!isRetryable || attempt >= maxAttempts || opts?.signal?.aborted) {
        throw err;
      }

      log.warn('withRetry: retrying after error', { attempt, status, delay });
      await new Promise<void>((resolve, reject) => {
        const id = setTimeout(resolve, delay);
        opts?.signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(id);
            reject(err);
          },
          { once: true }
        );
      });
      delay = Math.min(delay * 2, maxDelayMs);
    }
  }
}
