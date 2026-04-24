import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@shared/tasks';
import { createTask } from '@main/core/tasks/createTask';
import { AutomationsService, automationsService } from './AutomationsService';

const mocks = vi.hoisted(() => ({
  getProjectByIdMock: vi.fn(),
  selectMock: vi.fn(),
  fromMock: vi.fn(),
  whereMock: vi.fn(),
  limitMock: vi.fn(),
  updateMock: vi.fn(),
  setMock: vi.fn(),
  updateWhereMock: vi.fn(),
  orderByMock: vi.fn(),
  runLogsLimitMock: vi.fn(),
}));

vi.mock('@main/core/issues/registry', () => ({
  getIssueProvider: vi.fn(),
}));

vi.mock('@main/core/projects/operations/getProjects', () => ({
  getProjectById: mocks.getProjectByIdMock,
}));

vi.mock('@main/core/tasks/createTask', () => ({
  createTask: vi.fn(),
}));

vi.mock('./memory', () => ({
  buildMemoryPromptSection: vi.fn(() => ''),
  deleteAutomationMemory: vi.fn(),
  loadAutomationMemory: vi.fn(async () => ({ path: '/tmp/memory.md', content: '' })),
  resetAutomationMemory: vi.fn(),
  writeAutomationMemory: vi.fn(),
}));

vi.mock('@main/db/client', () => ({
  db: {
    select: mocks.selectMock,
    update: mocks.updateMock,
  },
}));

vi.mock('@main/lib/events', () => ({
  events: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
}));

vi.mock('@main/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const legacyTriggerRow = {
  id: 'auto-1',
  name: 'Legacy PR automation',
  projectId: 'project-1',
  projectName: 'Project 1',
  prompt: 'Review PRs',
  agentId: 'codex',
  mode: 'trigger',
  schedule: JSON.stringify({ type: 'daily', hour: 9, minute: 0 }),
  triggerType: 'github_pr',
  triggerConfig: null,
  useWorktree: 1,
  status: 'active',
  lastRunAt: null,
  nextRunAt: null,
  runCount: 0,
  lastRunResult: null,
  lastRunError: null,
  createdAt: '2026-04-19T08:00:00.000Z',
  updatedAt: '2026-04-19T08:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();

  mocks.selectMock.mockReturnValue({ from: mocks.fromMock });
  mocks.fromMock.mockReturnValue({ where: mocks.whereMock });
  mocks.whereMock.mockReturnValue({ limit: mocks.limitMock, orderBy: mocks.orderByMock });
  mocks.limitMock.mockResolvedValue([legacyTriggerRow]);
  mocks.orderByMock.mockReturnValue({ limit: mocks.runLogsLimitMock });
  mocks.runLogsLimitMock.mockResolvedValue([]);

  mocks.updateMock.mockReturnValue({ set: mocks.setMock });
  mocks.setMock.mockReturnValue({ where: mocks.updateWhereMock });
  mocks.updateWhereMock.mockResolvedValue(undefined);
});

describe('automationsService.update', () => {
  it('rejects blank names before persisting updates', async () => {
    await expect(
      automationsService.update({
        id: legacyTriggerRow.id,
        name: '   ',
      })
    ).rejects.toThrow('name is required');

    expect(mocks.updateMock).not.toHaveBeenCalled();
  });

  it('rejects invalid agent ids before persisting updates', async () => {
    await expect(
      automationsService.update({
        id: legacyTriggerRow.id,
        agentId: 'not-a-provider',
      })
    ).rejects.toThrow('Invalid agent id: not-a-provider');

    expect(mocks.updateMock).not.toHaveBeenCalled();
  });

  it('keeps legacy trigger automations editable when only other fields change', async () => {
    const updated = await automationsService.update({
      id: legacyTriggerRow.id,
      name: 'Renamed legacy PR automation',
    });

    expect(updated).toMatchObject({
      id: legacyTriggerRow.id,
      name: 'Renamed legacy PR automation',
      triggerType: 'github_pr',
    });
    expect(mocks.setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Renamed legacy PR automation',
        triggerType: 'github_pr',
      })
    );
  });

  it('allows the editor to resubmit the unchanged legacy trigger type', async () => {
    const updated = await automationsService.update({
      id: legacyTriggerRow.id,
      prompt: 'Handle legacy PR updates',
      mode: 'trigger',
      triggerType: 'github_pr',
    });

    expect(updated).toMatchObject({
      id: legacyTriggerRow.id,
      prompt: 'Handle legacy PR updates',
      triggerType: 'github_pr',
    });
    expect(mocks.setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'Handle legacy PR updates',
        triggerType: 'github_pr',
      })
    );
  });

  it('ignores invalid schedule updates while automation remains in trigger mode', async () => {
    const updated = await automationsService.update({
      id: legacyTriggerRow.id,
      mode: 'trigger',
      schedule: { type: 'custom', rrule: '' },
      prompt: 'Keep this in trigger mode',
    });

    expect(updated).toMatchObject({
      id: legacyTriggerRow.id,
      mode: 'trigger',
      prompt: 'Keep this in trigger mode',
    });
    expect(mocks.setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        schedule: legacyTriggerRow.schedule,
      })
    );
  });

  it('computes a next run when switching a trigger automation to schedule mode', async () => {
    const updated = await automationsService.update({
      id: legacyTriggerRow.id,
      mode: 'schedule',
    });

    expect(updated).toMatchObject({
      id: legacyTriggerRow.id,
      mode: 'schedule',
      schedule: { type: 'daily', hour: 9, minute: 0 },
    });
    expect(updated?.nextRunAt).not.toBeNull();
    expect(mocks.setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'schedule',
        nextRunAt: expect.any(String),
      })
    );
  });

  it('keeps rows with invalid persisted schedules editable via a safe default', async () => {
    mocks.limitMock.mockResolvedValueOnce([
      { ...legacyTriggerRow, mode: 'schedule', schedule: '{' },
    ]);

    const updated = await automationsService.update({
      id: legacyTriggerRow.id,
      name: 'Recovered schedule automation',
    });

    expect(updated).toMatchObject({
      name: 'Recovered schedule automation',
      schedule: { type: 'daily', hour: 9, minute: 0 },
    });
    expect(mocks.setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        schedule: JSON.stringify({ type: 'daily', hour: 9, minute: 0 }),
      })
    );
  });
});

describe('automationsService.create', () => {
  it('rejects blank names before loading the project', async () => {
    await expect(
      automationsService.create({
        name: ' ',
        projectId: 'project-1',
        prompt: 'Do work',
        agentId: 'codex',
        mode: 'schedule',
        schedule: { type: 'daily', hour: 9, minute: 0 },
      })
    ).rejects.toThrow('name is required');

    expect(mocks.getProjectByIdMock).not.toHaveBeenCalled();
  });

  it('rejects invalid agent ids before loading the project', async () => {
    await expect(
      automationsService.create({
        name: 'Daily work',
        projectId: 'project-1',
        prompt: 'Do work',
        agentId: 'invalid-agent',
        mode: 'schedule',
        schedule: { type: 'daily', hour: 9, minute: 0 },
      })
    ).rejects.toThrow('Invalid agent id: invalid-agent');

    expect(mocks.getProjectByIdMock).not.toHaveBeenCalled();
  });
});

describe('automationsService.updateRunLog', () => {
  it('clears the in-flight marker on terminal status', async () => {
    const service = new AutomationsService();
    // @ts-expect-error — access private field for test-only state setup
    service.inFlightRuns.add('auto-xyz');

    await service.updateRunLog(
      'run-1',
      { status: 'success', finishedAt: '2026-04-23T10:00:00Z' },
      'auto-xyz'
    );

    // @ts-expect-error — access private field for test-only state inspection
    expect(service.inFlightRuns.has('auto-xyz')).toBe(false);
  });

  it('leaves the in-flight marker alone for non-terminal updates', async () => {
    const service = new AutomationsService();
    // @ts-expect-error — access private field for test-only state setup
    service.inFlightRuns.add('auto-abc');

    await service.updateRunLog('run-2', { taskId: 'task-1' }, 'auto-abc');

    // @ts-expect-error — access private field for test-only state inspection
    expect(service.inFlightRuns.has('auto-abc')).toBe(true);
  });

  it('isolates state between independent service instances', () => {
    const a = new AutomationsService();
    const b = new AutomationsService();
    // @ts-expect-error — access private field for test-only state setup
    a.inFlightRuns.add('shared-id');
    // @ts-expect-error — access private field for test-only state inspection
    expect(b.inFlightRuns.has('shared-id')).toBe(false);
  });
});

describe('automationsService execution', () => {
  it('uses a unique worktree branch for each automation run', async () => {
    const service = new AutomationsService();
    const automation = {
      ...legacyTriggerRow,
      id: 'auto-abcdef123456',
      mode: 'schedule',
      schedule: { type: 'daily', hour: 9, minute: 0 },
      triggerType: null,
      triggerConfig: null,
      useWorktree: true,
    } as const;

    mocks.getProjectByIdMock.mockResolvedValue({
      id: 'project-1',
      name: 'Project 1',
      type: 'local',
      path: '/repo',
      baseRef: 'refs/heads/main',
    });
    const task: Task = {
      id: 'task-1',
      projectId: 'project-1',
      name: 'Automation task',
      status: 'todo',
      sourceBranch: 'main',
      createdAt: '2026-04-23T10:00:00.000Z',
      updatedAt: '2026-04-23T10:00:00.000Z',
      statusChangedAt: '2026-04-23T10:00:00.000Z',
      isPinned: false,
      prs: [],
      conversations: {},
    };
    vi.mocked(createTask).mockResolvedValue({ success: true, data: task });

    // @ts-expect-error — private method exercised to inspect task creation params
    await service.executeAutomation(automation, 'run_first111111');
    // @ts-expect-error — private method exercised to inspect task creation params
    await service.executeAutomation(automation, 'run_second222222');

    expect(vi.mocked(createTask).mock.calls[0]?.[0].strategy).toEqual({
      kind: 'new-branch',
      taskBranch: 'automation-123456-111111',
    });
    expect(vi.mocked(createTask).mock.calls[1]?.[0].strategy).toEqual({
      kind: 'new-branch',
      taskBranch: 'automation-123456-222222',
    });
  });
});

describe('automationsService.getRunLogs', () => {
  it('clamps caller supplied limits', async () => {
    const service = new AutomationsService();

    await service.getRunLogs('auto-1', 5000);
    await service.getRunLogs('auto-1', -10);

    expect(mocks.runLogsLimitMock).toHaveBeenNthCalledWith(1, 100);
    expect(mocks.runLogsLimitMock).toHaveBeenNthCalledWith(2, 1);
  });
});
