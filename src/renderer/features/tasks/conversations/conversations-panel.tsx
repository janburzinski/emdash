import { useHotkey } from '@tanstack/react-hotkeys';
import { MessageSquare } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { asMounted, getProjectStore } from '@renderer/features/projects/stores/project-selectors';
import { useAppSettingsKey } from '@renderer/features/settings/use-app-settings-key';
import { useIsActiveTask } from '@renderer/features/tasks/hooks/use-is-active-task';
import { TabbedPtyPanel } from '@renderer/features/tasks/tabbed-pty-panel';
import { useProvisionedTask, useTaskViewContext } from '@renderer/features/tasks/task-view-context';
import {
  getEffectiveHotkey,
  getHotkeyRegistration,
} from '@renderer/lib/hooks/useKeyboardShortcuts';
import { useTabShortcuts } from '@renderer/lib/hooks/useTabShortcuts';
import { useShowModal } from '@renderer/lib/modal/modal-provider';
import { Button } from '@renderer/lib/ui/button';
import { EmptyState } from '@renderer/lib/ui/empty-state';
import { ShortcutHint } from '@renderer/lib/ui/shortcut-hint';
import { ContextBar } from './context-bar';
import { ConversationStore } from './conversation-manager';
import { ConversationsTabs } from './conversation-tabs';

export const ConversationsPanel = observer(function ConversationsPanel({
  allowShortcuts = true,
  paneId = 'conversations',
  conversationId,
  onConversationCreated,
}: {
  allowShortcuts?: boolean;
  paneId?: string;
  blockedConversationIds?: readonly string[];
  conversationId?: string | null;
  onConversationCreated?: (conversationId: string) => void;
}) {
  const { projectId, taskId } = useTaskViewContext();
  const provisioned = useProvisionedTask();
  const baseConversationTabs = provisioned.taskView.conversationTabs;
  const conversationTabs = useMemo(() => {
    if (!conversationId) return baseConversationTabs;
    const scoped = Object.create(baseConversationTabs) as typeof baseConversationTabs;
    Object.defineProperties(scoped, {
      tabs: {
        get: () => baseConversationTabs.tabs.filter((tab) => tab.data.id === conversationId),
      },
      activeTab: {
        get: () => baseConversationTabs.tabs.find((tab) => tab.data.id === conversationId),
      },
      activeTabId: { get: () => conversationId },
      setActiveTab: { value: () => {} },
      setVisible: { value: () => {} },
    });
    return scoped;
  }, [baseConversationTabs, conversationId]);
  const showCreateConversationModal = useShowModal('createConversationModal');
  const { value: keyboard } = useAppSettingsKey('keyboard');
  const isActive = useIsActiveTask(taskId);
  const [isPanelFocused, setIsPanelFocused] = useState(false);
  const mountedProject = asMounted(getProjectStore(projectId));
  const shouldSetWorkingOnEnter = mountedProject?.data.type !== 'ssh';
  const remoteConnectionId =
    mountedProject?.data.type === 'ssh' ? mountedProject.data.connectionId : undefined;
  const newConversationHotkey = getEffectiveHotkey('newConversation', keyboard);

  const autoFocus = allowShortcuts && isActive && provisioned.taskView.focusedRegion === 'main';
  const handleCreate = () =>
    showCreateConversationModal({
      connectionId: remoteConnectionId,
      projectId,
      taskId,
      onSuccess: (result) => {
        const { conversationId } = result as { conversationId: string };
        onConversationCreated?.(conversationId);
        conversationTabs.setActiveTab(conversationId);
        provisioned.taskView.setFocusedRegion('main');
      },
    });

  useTabShortcuts(conversationTabs, { focused: allowShortcuts && isPanelFocused });
  useHotkey(getHotkeyRegistration('newConversation', keyboard), handleCreate, {
    enabled: allowShortcuts && isActive && newConversationHotkey !== null,
  });

  useEffect(() => {
    conversationTabs.setVisible(allowShortcuts && isActive);
    return () => {
      conversationTabs.setVisible(false);
    };
  }, [allowShortcuts, conversationTabs, isActive]);

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <TabbedPtyPanel<ConversationStore>
          autoFocus={autoFocus}
          onFocusChange={(focused) => {
            setIsPanelFocused(focused);
            if (focused) provisioned.taskView.setFocusedRegion('main');
          }}
          store={conversationTabs}
          paneId={paneId}
          getSession={(s) => s.session}
          onEnterPress={shouldSetWorkingOnEnter ? (s) => s.setWorking() : undefined}
          onInterruptPress={(s) => s.clearWorking()}
          mapShiftEnterToCtrlJ
          remoteConnectionId={remoteConnectionId}
          tabBar={
            <ConversationsTabs
              projectId={projectId}
              taskId={taskId}
              conversationId={conversationId}
              onConversationCreated={onConversationCreated}
            />
          }
          emptyState={
            <EmptyState
              icon={<MessageSquare className="h-5 w-5 text-muted-foreground" />}
              label="No conversations yet"
              description="Create one to open a terminal session for this task and work with an agent."
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCreate}
                  className="flex items-center gap-2"
                >
                  Create conversation
                  {allowShortcuts && <ShortcutHint settingsKey="newConversation" />}
                </Button>
              }
            />
          }
        />
      </div>
      <ContextBar />
    </div>
  );
});
