import { useHotkey } from '@tanstack/react-hotkeys';
import { toast } from 'sonner';
import { asMounted, getProjectStore } from '@renderer/features/projects/stores/project-selectors';
import { useAppSettingsKey } from '@renderer/features/settings/use-app-settings-key';
import {
  findFocusedTileId,
  MAX_SPLIT_LEAVES,
} from '@renderer/features/tasks/stores/project-split-store';
import { asProvisioned, getTaskManagerStore } from '@renderer/features/tasks/stores/task-selectors';
import { useTaskViewContext } from '@renderer/features/tasks/task-view-context';
import {
  getEffectiveHotkey,
  getHotkeyRegistration,
} from '@renderer/lib/hooks/useKeyboardShortcuts';
import { useNavigate } from '@renderer/lib/layout/navigation-provider';
import { useShowModal } from '@renderer/lib/modal/modal-provider';
import { useTaskViewNavigation } from './use-task-view-navigation';

/**
 * Mounts keyboard shortcuts that are scoped to the active task view:
 * - Switch between task sub-views (conversations, diff, editor)
 * - Navigate to the next / previous task within the same project
 *
 * Must be called inside a component that has access to TaskViewContext.
 */
export function useTaskViewShortcuts() {
  const { value: keyboard } = useAppSettingsKey('keyboard');
  const { projectId, taskId } = useTaskViewContext();
  const { openAgentsView, openEditorView, openDiffView } = useTaskViewNavigation();
  const { navigate } = useNavigate();
  const showCreateConversation = useShowModal('createConversationModal');
  const taskMgr = getTaskManagerStore(projectId);
  const agentsHotkey = getEffectiveHotkey('taskViewAgents', keyboard);
  const diffHotkey = getEffectiveHotkey('taskViewDiff', keyboard);
  const editorHotkey = getEffectiveHotkey('taskViewEditor', keyboard);
  const nextTaskHotkey = getEffectiveHotkey('nextProject', keyboard);
  const prevTaskHotkey = getEffectiveHotkey('prevProject', keyboard);
  const splitRightHotkey = getEffectiveHotkey('splitTileRight', keyboard);
  const splitDownHotkey = getEffectiveHotkey('splitTileDown', keyboard);
  const closeTileHotkey = getEffectiveHotkey('closeSplitTile', keyboard);

  const mountedProject = asMounted(getProjectStore(projectId));
  const splitLayout = mountedProject?.splitLayout;
  const connectionId =
    mountedProject?.data.type === 'ssh' ? mountedProject.data.connectionId : undefined;

  useHotkey(getHotkeyRegistration('taskViewAgents', keyboard), openAgentsView, {
    enabled: agentsHotkey !== null,
  });
  useHotkey(getHotkeyRegistration('taskViewDiff', keyboard), openDiffView, {
    enabled: diffHotkey !== null,
  });
  useHotkey(getHotkeyRegistration('taskViewEditor', keyboard), openEditorView, {
    enabled: editorHotkey !== null,
  });

  useHotkey(
    getHotkeyRegistration('nextProject', keyboard),
    () => {
      if (!taskMgr) return;
      const ids = Array.from(taskMgr.tasks.keys());
      const idx = ids.indexOf(taskId);
      const nextId = ids[idx + 1];
      if (nextId) navigate('task', { projectId, taskId: nextId });
    },
    { enabled: nextTaskHotkey !== null }
  );

  useHotkey(
    getHotkeyRegistration('prevProject', keyboard),
    () => {
      if (!taskMgr) return;
      const ids = Array.from(taskMgr.tasks.keys());
      const idx = ids.indexOf(taskId);
      if (idx > 0) {
        const prevId = ids[idx - 1];
        if (prevId) navigate('task', { projectId, taskId: prevId });
      }
    },
    { enabled: prevTaskHotkey !== null }
  );

  useHotkey(
    getHotkeyRegistration('splitTileRight', keyboard),
    (event) => {
      event?.preventDefault();
      if (!splitLayout) return;
      if (splitLayout.leafCount >= MAX_SPLIT_LEAVES) {
        toast.error(`Max ${MAX_SPLIT_LEAVES} tiles per tab`);
        return;
      }
      const sourceLeafId = findFocusedTileId(splitLayout);
      const currentConversationId =
        asProvisioned(taskMgr?.tasks.get(taskId))?.taskView.conversationTabs.activeTabId ?? null;
      splitLayout.setLeafConversation(sourceLeafId, currentConversationId);
      const leafId = splitLayout.splitActive('horizontal', sourceLeafId);
      if (!leafId) return;
      splitLayout.setLeafTask(leafId, taskId);
      splitLayout.focusLeaf(leafId);
      showCreateConversation({
        connectionId,
        projectId,
        taskId,
        onSuccess: (result) => {
          const { conversationId } = result as { conversationId: string };
          const provisioned = asProvisioned(taskMgr?.tasks.get(taskId));
          splitLayout.setLeafConversation(leafId, conversationId);
          provisioned?.taskView.setView('agents');
          provisioned?.taskView.conversationTabs.setActiveTab(conversationId);
          provisioned?.taskView.setFocusedRegion('main');
          navigate('task', { projectId, taskId });
        },
        onClose: () => {
          if (splitLayout.leafCount > 1) splitLayout.closeLeaf(leafId);
        },
      });
    },
    { enabled: splitRightHotkey !== null }
  );

  useHotkey(
    getHotkeyRegistration('splitTileDown', keyboard),
    (event) => {
      event?.preventDefault();
      if (!splitLayout) return;
      if (splitLayout.leafCount >= MAX_SPLIT_LEAVES) {
        toast.error(`Max ${MAX_SPLIT_LEAVES} tiles per tab`);
        return;
      }
      const sourceLeafId = findFocusedTileId(splitLayout);
      const currentConversationId =
        asProvisioned(taskMgr?.tasks.get(taskId))?.taskView.conversationTabs.activeTabId ?? null;
      splitLayout.setLeafConversation(sourceLeafId, currentConversationId);
      const leafId = splitLayout.splitActive('vertical', sourceLeafId);
      if (!leafId) return;
      splitLayout.setLeafTask(leafId, taskId);
      splitLayout.focusLeaf(leafId);
      showCreateConversation({
        connectionId,
        projectId,
        taskId,
        onSuccess: (result) => {
          const { conversationId } = result as { conversationId: string };
          const provisioned = asProvisioned(taskMgr?.tasks.get(taskId));
          splitLayout.setLeafConversation(leafId, conversationId);
          provisioned?.taskView.setView('agents');
          provisioned?.taskView.conversationTabs.setActiveTab(conversationId);
          provisioned?.taskView.setFocusedRegion('main');
          navigate('task', { projectId, taskId });
        },
        onClose: () => {
          if (splitLayout.leafCount > 1) splitLayout.closeLeaf(leafId);
        },
      });
    },
    { enabled: splitDownHotkey !== null }
  );

  useHotkey(
    getHotkeyRegistration('closeSplitTile', keyboard),
    (event) => {
      if (!splitLayout || splitLayout.leafCount <= 1) return;
      const focusedTileId = findFocusedTileId(splitLayout);
      event?.preventDefault();
      splitLayout.closeLeaf(focusedTileId);
      const newActive = splitLayout.activeLeaf;
      if (newActive?.taskId && newActive.taskId !== taskId) {
        navigate('task', { projectId, taskId: newActive.taskId });
      }
    },
    { enabled: closeTileHotkey !== null, conflictBehavior: 'allow' }
  );
}
