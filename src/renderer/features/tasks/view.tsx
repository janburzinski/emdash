import { observer } from 'mobx-react-lite';
import { useEffect, type ReactNode } from 'react';
import { ViewDefinition } from '@renderer/app/view-registry';
import { asMounted, getProjectStore } from '@renderer/features/projects/stores/project-selectors';
import {
  getTaskManagerStore,
  getTaskStore,
  taskViewKind,
} from '@renderer/features/tasks/stores/task-selectors';
import {
  ProvisionedTaskProvider,
  TaskViewWrapper,
} from '@renderer/features/tasks/task-view-context';
import { EditorProvider } from './editor/editor-provider';
import { TaskRightSidebar } from './right-panel';
import { SplitContainer } from './split-container';
import { TaskTitlebar } from './task-titlebar';

const TaskViewWrapperWithProviders = observer(function TaskViewWrapperWithProviders({
  children,
  projectId,
  taskId,
}: {
  children: ReactNode;
  projectId: string;
  taskId: string;
}) {
  const taskStore = getTaskStore(projectId, taskId);
  const kind = taskViewKind(taskStore, projectId);

  // Auto-provision when the task view is rendered with an idle task — covers
  // session restore where the task wasn't in openTaskIds, direct navigation,
  // and any other path that lands on the task view before provisioning runs.
  useEffect(() => {
    if (kind !== 'idle') return;
    if (taskStore && 'archivedAt' in taskStore.data && taskStore.data.archivedAt) return;

    getTaskManagerStore(projectId)
      ?.provisionTask(taskId)
      .catch(() => {});
  }, [kind, projectId, taskId, taskStore]);

  // Split layouts are scoped per task tab. Navigating between tasks switches
  // the active split tree instead of rebinding a project-wide tree to the route.
  const project = asMounted(getProjectStore(projectId));
  useEffect(() => {
    project?.splitLayout.setActiveTask(taskId);
  }, [project, taskId]);

  useEffect(() => {
    if (!project) return;
    const taskMgr = getTaskManagerStore(projectId);
    if (!taskMgr) return;

    const currentStore = taskMgr.tasks.get(taskId);
    const currentProvisioned = currentStore
      ? 'provisionedTask' in currentStore
        ? currentStore.provisionedTask
        : null
      : null;
    if (currentProvisioned) {
      project.splitLayout.reconcileConversations(
        taskId,
        Array.from(currentProvisioned.conversations.conversations.keys())
      );
    }

    for (const leaf of project.splitLayout.leaves) {
      const leafTaskId = leaf.taskId ?? taskId;
      const store = taskMgr.tasks.get(leafTaskId);
      const provisioned = store
        ? 'provisionedTask' in store
          ? store.provisionedTask
          : null
        : null;
      if (
        leaf.conversationId &&
        provisioned &&
        !provisioned.conversations.conversations.has(leaf.conversationId)
      ) {
        leaf.conversationId = null;
        continue;
      }

      if (leafTaskId === taskId) continue;
      if (taskViewKind(store, projectId) === 'idle') {
        taskMgr.provisionTask(leafTaskId).catch(() => {});
      }
    }
  }, [project, projectId, taskId]);

  if (kind !== 'ready') {
    return (
      <TaskViewWrapper projectId={projectId} taskId={taskId}>
        {children}
      </TaskViewWrapper>
    );
  }

  return (
    <TaskViewWrapper projectId={projectId} taskId={taskId}>
      <ProvisionedTaskProvider projectId={projectId} taskId={taskId}>
        <EditorProvider key={taskId} taskId={taskId} projectId={projectId}>
          {children}
        </EditorProvider>
      </ProvisionedTaskProvider>
    </TaskViewWrapper>
  );
});

export const taskView = {
  WrapView: TaskViewWrapperWithProviders,
  TitlebarSlot: TaskTitlebar,
  MainPanel: SplitContainer,
  RightPanel: TaskRightSidebar,
} satisfies ViewDefinition<{ projectId: string; taskId: string }>;
