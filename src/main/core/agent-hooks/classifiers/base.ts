import type { NotificationType } from '@shared/events/agentEvents';

export type ClassificationResult =
  | {
      type: 'notification';
      notificationType: NotificationType;
      message?: string;
    }
  | {
      type: 'stop';
      message?: string;
    }
  | {
      type: 'error';
      message?: string;
    }
  | undefined;

export interface ProviderClassifier {
  classify(chunk: string): ClassificationResult;

  reset(): void;
}

type ClassifyFn = (text: string) => ClassificationResult;

const MAX_BUFFER = 4096; // 4KB sliding window

export function stripAnsi(s: string): string {
  return s
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
    .replace(/\r/g, '')
    .replace(/\x1b\][^\x07]*\x07/g, '')
    .replace(/\x1b\][^\x1b]*\x1b\\/g, '');
}

export function createProviderClassifier(classifyFn: ClassifyFn): ProviderClassifier {
  let buffer = '';

  return {
    classify(chunk: string): ClassificationResult {
      // Append to buffer
      buffer += chunk;

      // Trim from front if too large (keep most recent data)
      if (buffer.length > MAX_BUFFER) {
        buffer = buffer.slice(-MAX_BUFFER);
      }

      // Strip ANSI codes for pattern matching
      const clean = stripAnsi(buffer);

      // Call provider-specific classification
      return classifyFn(clean);
    },

    reset(): void {
      buffer = '';
    },
  };
}
