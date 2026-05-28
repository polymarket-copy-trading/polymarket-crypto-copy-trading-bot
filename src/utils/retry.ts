export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, "shouldRetry">> = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 10_000,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };
  const shouldRetry = options.shouldRetry ?? (() => true);

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      await sleep(delay);
    }
  }

  throw lastError;
}
