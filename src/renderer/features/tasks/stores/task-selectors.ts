import type { Task } from '@shared/tasks';
import { isUnmountedProject } from '@renderer/features/projects/stores/project';
import { getProjectManagerStore } from '@renderer/features/projects/stores/project-selectors';
import type { AgentStatus } from '@renderer/features/tasks/conversations/conversation-manager';
import {
  isUnprovisioned,
  isUnregistered,
  ProvisionedTask,
  registeredTaskData,
  TaskStore,
} from './task';
import type { TaskManagerStore } from './task-manager';

export function getTaskManagerStore(projectId: string): TaskManagerStore | undefined {
  return getProjectManagerStore().projects.get(projectId)?.mountedProject?.taskManager;
}

export function getTaskStore(projectId: string, taskId: string): TaskStore | undefined {
  return getTaskManagerStore(projectId)?.tasks.get(taskId);
}

export function getRegisteredTaskData(projectId: string, taskId: string): Task | undefined {
  const store = getTaskStore(projectId, taskId);
  return store ? registeredTaskData(store) : undefined;
}

export function getTaskGitStore(projectId: string, taskId: string) {
  return asProvisioned(getTaskStore(projectId, taskId))?.workspace.git;
}

export function taskAgentStatus(store: TaskStore): AgentStatus | null {
  return asProvisioned(store)?.conversations.taskStatus ?? null;
}

type TaskViewKind =
  | 'missing'
  | 'project-mounting'
  | 'project-error'
  | 'creating'
  | 'create-error'
  | 'provisioning'
  | 'provision-error'
  | 'teardown'
  | 'teardown-error'
  | 'idle'
  | 'ready';

export function taskViewKind(store: TaskStore | undefined, projectId: string): TaskViewKind {
  const projectStore = getProjectManagerStore().projects.get(projectId);
  if (!projectStore) return 'missing';
  if (isUnmountedProject(projectStore)) {
    if (projectStore.phase === 'error') return 'project-error';
    return 'project-mounting';
  }
  if (projectStore.state === 'unregistered') return 'missing';
  if (!store) return 'missing';
  if (isUnregistered(store)) {
    return store.phase === 'creating' ? 'creating' : 'create-error';
  }
  if (isUnprovisioned(store)) {
    if (store.phase === 'provision') return 'provisioning';
    if (store.phase === 'provision-error') return 'provision-error';
    if (store.phase === 'teardown') return 'teardown';
    if (store.phase === 'teardown-error') return 'teardown-error';
    return 'idle';
  }
  return 'ready';
}

export function asProvisioned(store: TaskStore | undefined): ProvisionedTask | undefined {
  return store?.provisionedTask ?? undefined;
}

export function taskDisplayName(store: TaskStore | undefined): string | undefined {
  return store?.data.name;
}

export function taskErrorMessage(store: TaskStore | undefined): string | undefined {
  if (!store) return undefined;
  if (isUnregistered(store) && store.phase === 'create-error') {
    return store.errorMessage ?? 'Failed to create task';
  }
  if (isUnprovisioned(store)) {
    if (store.phase === 'provision-error') {
      return store.errorMessage ?? 'Failed to set up workspace';
    }
    if (store.phase === 'teardown-error') {
      return store.errorMessage ?? 'Failed to tear down task';
    }
  }
  return undefined;
}
