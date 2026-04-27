import { useHotkey } from '@tanstack/react-hotkeys';
import { useEffect } from 'react';
import { toast } from 'sonner';
import {
  menuCloseTileChannel,
  menuSplitTileDownChannel,
  menuSplitTileRightChannel,
} from '@shared/events/appEvents';
import { asMounted, getProjectStore } from '@renderer/features/projects/stores/project-selectors';
import { useAppSettingsKey } from '@renderer/features/settings/use-app-settings-key';
import {
  findFocusedTileId,
  MAX_SPLIT_LEAVES,
} from '@renderer/features/tasks/stores/project-split-store';
import { asProvisioned, getTaskManagerStore } from '@renderer/features/tasks/stores/task-selectors';
import { toast as appToast } from '@renderer/lib/hooks/use-toast';
import {
  getEffectiveHotkey,
  getHotkeyRegistration,
} from '@renderer/lib/hooks/useKeyboardShortcuts';
import { useTheme } from '@renderer/lib/hooks/useTheme';
import { events } from '@renderer/lib/ipc';
import { useWorkspaceLayoutContext } from '@renderer/lib/layout/layout-provider';
import {
  useNavigate,
  useParams,
  useWorkspaceSlots,
} from '@renderer/lib/layout/navigation-provider';
import { useShowModal } from '@renderer/lib/modal/modal-provider';

/**
 * Mounts global keyboard shortcut handlers for the entire application.
 * Renders nothing — exists only to register useHotkey() calls that are always active.
 * Must be mounted inside all relevant providers (ModalProvider, WorkspaceLayoutContext, etc.).
 */
export function AppKeyboardShortcuts() {
  const { value: keyboard } = useAppSettingsKey('keyboard');
  const showNewProject = useShowModal('addProjectModal');
  const showCreateTask = useShowModal('taskModal');
  const showCreateConversation = useShowModal('createConversationModal');
  const { toggleLeft, toggleRight } = useWorkspaceLayoutContext();
  const { toggleTheme } = useTheme();
  const { navigate } = useNavigate();
  const commandPaletteHotkey = getEffectiveHotkey('commandPalette', keyboard);
  const settingsHotkey = getEffectiveHotkey('settings', keyboard);
  const toggleLeftSidebarHotkey = getEffectiveHotkey('toggleLeftSidebar', keyboard);
  const toggleRightSidebarHotkey = getEffectiveHotkey('toggleRightSidebar', keyboard);
  const toggleThemeHotkey = getEffectiveHotkey('toggleTheme', keyboard);
  const newProjectHotkey = getEffectiveHotkey('newProject', keyboard);
  const newTaskHotkey = getEffectiveHotkey('newTask', keyboard);

  // Resolve current project context from whichever view is active
  const { currentView } = useWorkspaceSlots();
  const { params: taskParams } = useParams('task');
  const { params: projectParams } = useParams('project');
  const currentProjectId =
    currentView === 'task'
      ? taskParams.projectId
      : currentView === 'project'
        ? projectParams.projectId
        : undefined;

  useHotkey(
    getHotkeyRegistration('commandPalette', keyboard),
    () => appToast({ title: 'CMDK coming soon' }),
    { enabled: commandPaletteHotkey !== null }
  );

  // Bridge Electron menu accelerators (Cmd+D / Cmd+Shift+D / Shift+Cmd+W) into
  // the active project's split layout. The menu accelerator preempts the
  // tanstack hotkey, so this subscription is the actual entry point on macOS.
  useEffect(() => {
    if (currentView !== 'task' || !currentProjectId) return;
    const projectId = currentProjectId;

    const splitOrToast = (orientation: 'horizontal' | 'vertical') => {
      const mountedProject = asMounted(getProjectStore(projectId));
      const layout = mountedProject?.splitLayout;
      const taskId = taskParams.taskId;
      if (!layout || !taskId) return;
      if (layout.leafCount >= MAX_SPLIT_LEAVES) {
        toast.error(`Max ${MAX_SPLIT_LEAVES} tiles per tab`);
        return;
      }
      const sourceLeafId = findFocusedTileId(layout);
      const currentConversationId =
        asProvisioned(getTaskManagerStore(projectId)?.tasks.get(taskId))?.taskView.conversationTabs
          .activeTabId ?? null;
      layout.setLeafConversation(sourceLeafId, currentConversationId);
      const leafId = layout.splitActive(orientation, sourceLeafId);
      if (!leafId) return;
      layout.setLeafTask(leafId, taskId);
      layout.focusLeaf(leafId);
      showCreateConversation({
        connectionId:
          mountedProject?.data.type === 'ssh' ? mountedProject.data.connectionId : undefined,
        projectId,
        taskId,
        onSuccess: (result) => {
          const { conversationId } = result as { conversationId: string };
          const provisioned = asProvisioned(getTaskManagerStore(projectId)?.tasks.get(taskId));
          layout.setLeafConversation(leafId, conversationId);
          provisioned?.taskView.setView('agents');
          provisioned?.taskView.conversationTabs.setActiveTab(conversationId);
          provisioned?.taskView.setFocusedRegion('main');
          navigate('task', { projectId, taskId });
        },
        onClose: () => {
          if (layout.leafCount > 1) layout.closeLeaf(leafId);
        },
      });
    };

    const unsubRight = events.on(menuSplitTileRightChannel, () => splitOrToast('horizontal'));
    const unsubDown = events.on(menuSplitTileDownChannel, () => splitOrToast('vertical'));
    const unsubClose = events.on(menuCloseTileChannel, () => {
      const layout = asMounted(getProjectStore(projectId))?.splitLayout;
      if (!layout || layout.leafCount <= 1) return;
      layout.closeLeaf(findFocusedTileId(layout));
      const next = layout.activeLeaf;
      if (next?.taskId) navigate('task', { projectId, taskId: next.taskId });
    });

    return () => {
      unsubRight();
      unsubDown();
      unsubClose();
    };
  }, [currentView, currentProjectId, navigate, showCreateConversation, taskParams.taskId]);

  useHotkey(getHotkeyRegistration('settings', keyboard), () => navigate('settings'), {
    enabled: settingsHotkey !== null,
  });

  useHotkey(getHotkeyRegistration('toggleLeftSidebar', keyboard), () => toggleLeft(), {
    enabled: toggleLeftSidebarHotkey !== null,
  });

  useHotkey(getHotkeyRegistration('toggleRightSidebar', keyboard), () => toggleRight(), {
    enabled: toggleRightSidebarHotkey !== null,
  });

  useHotkey(getHotkeyRegistration('toggleTheme', keyboard), () => toggleTheme(), {
    enabled: toggleThemeHotkey !== null,
  });

  useHotkey(
    getHotkeyRegistration('newProject', keyboard),
    () => showNewProject({ strategy: 'local', mode: 'pick' }),
    { enabled: newProjectHotkey !== null }
  );

  useHotkey(
    getHotkeyRegistration('newTask', keyboard),
    () => {
      if (currentProjectId) showCreateTask({ projectId: currentProjectId });
    },
    { enabled: !!currentProjectId && newTaskHotkey !== null }
  );

  return null;
}
