import { describe, expect, it, vi } from 'vitest';
import type { AutomationRunStatusPayload } from '@shared/events/automationEvents';

let eventHandler: ((payload: AutomationRunStatusPayload) => void) | null = null;

vi.mock('@renderer/lib/ipc', () => ({
  events: {
    on: (_channel: unknown, cb: (payload: AutomationRunStatusPayload) => void) => {
      eventHandler = cb;
      return () => undefined;
    },
  },
}));

function emitRunEvent(payload: AutomationRunStatusPayload): void {
  if (!eventHandler) {
    throw new Error('Automation run-status handler is not initialized');
  }
  eventHandler(payload);
}

describe('running automations store', () => {
  it('keeps an automation marked running until all overlapping runs end', async () => {
    const { getRunningSnapshot, isAutomationRunning, subscribe } = await import(
      '@renderer/features/automations/components/runningAutomationsStore'
    );

    const unsubscribe = subscribe(() => undefined);

    emitRunEvent({
      automationId: 'auto-1',
      runLogId: 'run-1',
      taskId: 'task-1',
      status: 'started',
    });
    emitRunEvent({
      automationId: 'auto-1',
      runLogId: 'run-2',
      taskId: 'task-2',
      status: 'started',
    });

    expect(isAutomationRunning('auto-1')).toBe(true);
    expect(getRunningSnapshot().size).toBe(1);

    emitRunEvent({
      automationId: 'auto-1',
      runLogId: 'run-1',
      taskId: 'task-1',
      status: 'ended',
    });

    expect(isAutomationRunning('auto-1')).toBe(true);
    expect(getRunningSnapshot().size).toBe(1);

    emitRunEvent({
      automationId: 'auto-1',
      runLogId: 'run-2',
      taskId: 'task-2',
      status: 'ended',
    });

    expect(isAutomationRunning('auto-1')).toBe(false);
    expect(getRunningSnapshot().size).toBe(0);

    unsubscribe();
  });

  it('notifies subscribers on every run transition', async () => {
    const { subscribe } = await import(
      '@renderer/features/automations/components/runningAutomationsStore'
    );

    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    emitRunEvent({
      automationId: 'auto-notify',
      runLogId: 'run-a',
      taskId: null,
      status: 'started',
    });
    emitRunEvent({
      automationId: 'auto-notify',
      runLogId: 'run-a',
      taskId: null,
      status: 'ended',
    });

    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('fires onAnyRunEnded only for ended events, once per run', async () => {
    const { onAnyRunEnded } = await import(
      '@renderer/features/automations/components/runningAutomationsStore'
    );

    const onEnded = vi.fn();
    const unsubscribe = onAnyRunEnded(onEnded);

    emitRunEvent({
      automationId: 'auto-ended',
      runLogId: 'run-1',
      taskId: null,
      status: 'started',
    });
    expect(onEnded).not.toHaveBeenCalled();

    emitRunEvent({
      automationId: 'auto-ended',
      runLogId: 'run-1',
      taskId: null,
      status: 'ended',
    });
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(onEnded).toHaveBeenCalledWith('auto-ended');

    unsubscribe();

    emitRunEvent({
      automationId: 'auto-ended',
      runLogId: 'run-2',
      taskId: null,
      status: 'ended',
    });
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it('tolerates unsubscribing more than once', async () => {
    const { subscribe, onAnyRunEnded } = await import(
      '@renderer/features/automations/components/runningAutomationsStore'
    );

    const unsubscribeListener = subscribe(() => undefined);
    unsubscribeListener();
    expect(() => unsubscribeListener()).not.toThrow();

    const unsubscribeEnded = onAnyRunEnded(() => undefined);
    unsubscribeEnded();
    expect(() => unsubscribeEnded()).not.toThrow();
  });
});
