import { log } from '@renderer/utils/logger';
import { captureTelemetry } from '../utils/telemetryClient';

type Severity = 'low' | 'medium' | 'high' | 'critical';
type ErrorContext = {
  component?: string;
  severity?: Severity;
  error_type?: string;
  [key: string]: unknown;
};

let lastErrorTimestamp = 0;
let sessionErrors = 0;

function captureException(error: Error | unknown, context?: ErrorContext): void {
  try {
    const now = Date.now();
    if (now - lastErrorTimestamp < 100) return;
    lastErrorTimestamp = now;
    sessionErrors++;

    const errorObj = error instanceof Error ? error : new Error(String(error));
    const message = errorObj.message || 'Unknown error';
    const stack = errorObj.stack || '';
    const type = context?.error_type || 'unknown_error';
    const component = context?.component || 'renderer';

    const properties: Record<string, unknown> = {
      $exception_message: message.slice(0, 500),
      $exception_type: type,
      $exception_stack_trace_raw: stack.slice(0, 2000),
      $exception_fingerprint: `${component}_${type}`,
      severity: context?.severity || 'medium',
      session_errors: sessionErrors,
      error_timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      ...context,
    };

    captureTelemetry(
      '$exception',
      Object.fromEntries(Object.entries(properties).filter(([, v]) => v != null)) as never
    );
    log.error('[ErrorTracking]', message, { component });
  } catch (trackingError) {
    log.warn('Failed to capture exception:', trackingError);
  }
}

export function captureComponentError(
  error: Error | unknown,
  componentName: string,
  context?: Partial<ErrorContext>
) {
  captureException(error, {
    error_type: 'render_error',
    severity: 'high',
    component: componentName,
    ...context,
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    captureException(event.error || new Error(event.message), {
      error_type: 'unhandled_error',
      severity: 'critical',
      component: 'global',
    });
  });
  window.addEventListener('unhandledrejection', (event) => {
    captureException(event.reason || new Error('Unhandled Promise Rejection'), {
      error_type: 'unhandled_rejection',
      severity: 'high',
      component: 'global',
    });
  });
}
