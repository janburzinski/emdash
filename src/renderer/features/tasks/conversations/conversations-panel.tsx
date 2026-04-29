import { useHotkey } from '@tanstack/react-hotkeys';
import { MessageSquare } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { asMounted, getProjectStore } from '@renderer/features/projects/stores/project-selectors';
import { useAppSettingsKey } from '@renderer/features/settings/use-app-settings-key';
import { useIsActiveTask } from '@renderer/features/tasks/hooks/use-is-active-task';
import { TabbedPtyPanel } from '@renderer/features/tasks/tabbed-pty-panel';
import { useProvisionedTask, useTaskViewContext } from '@renderer/features/tasks/task-view-context';
import type { TerminalStore } from '@renderer/features/tasks/terminals/terminal-manager';
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

export const ConversationsPanel = observer(function ConversationsPanel() {
  const { projectId, taskId } = useTaskViewContext();
  const provisioned = useProvisionedTask();
  const conversationTabs = provisioned.taskView.conversationTabs;
  const terminalTabs = provisioned.taskView.terminalTabs;
  const terminalMgr = provisioned.terminals;
  const showCreateConversationModal = useShowModal('createConversationModal');
  const { value: keyboard } = useAppSettingsKey('keyboard');
  const isActive = useIsActiveTask(taskId);
  const [isPanelFocused, setIsPanelFocused] = useState(false);
  const mountedProject = asMounted(getProjectStore(projectId));
  const shouldSetWorkingOnEnter = mountedProject?.data.type !== 'ssh';
  const remoteConnectionId =
    mountedProject?.data.type === 'ssh' ? mountedProject.data.connectionId : undefined;
  const newConversationHotkey = getEffectiveHotkey('newConversation', keyboard);

  const autoFocus = isActive && provisioned.taskView.focusedRegion === 'main';

  const handleCreate = () =>
    showCreateConversationModal({
      connectionId: remoteConnectionId,
      projectId,
      taskId,
      onSuccess: (result) => {
        if (result.type === 'conversation') {
          conversationTabs.setActiveTab(result.conversationId);
        } else {
          conversationTabs.setActiveTab(result.terminalId);
          terminalTabs.setActiveTab(result.terminalId);
        }
        provisioned.taskView.setFocusedRegion('main');
      },
    });

  const sessionTabs = {
    get tabs() {
      return [...conversationTabs.tabs, ...terminalTabs.tabs];
    },
    get activeTabId() {
      return conversationTabs.activeTabId;
    },
    get activeTab() {
      const activeId = conversationTabs.activeTabId;
      if (!activeId) return undefined;
      return conversationTabs.activeTab ?? terminalMgr.terminals.get(activeId);
    },
    setActiveTab(id: string) {
      conversationTabs.setActiveTab(id);
      if (terminalMgr.terminals.has(id)) terminalTabs.setActiveTab(id);
    },
    removeTab(id: string) {
      if (terminalMgr.terminals.has(id)) {
        terminalTabs.removeTab(id);
      } else {
        conversationTabs.removeTab(id);
      }
    },
    reorderTabs(from: number, to: number) {
      conversationTabs.reorderTabs(from, to);
    },
    setNextTabActive() {
      const tabs = this.tabs;
      const index = tabs.findIndex((tab) => tab.data.id === this.activeTabId);
      const next = tabs[index + 1];
      if (next) this.setActiveTab(next.data.id);
    },
    setPreviousTabActive() {
      const tabs = this.tabs;
      const index = tabs.findIndex((tab) => tab.data.id === this.activeTabId);
      const previous = tabs[index - 1];
      if (previous) this.setActiveTab(previous.data.id);
    },
    setTabActiveIndex(index: number) {
      const tab = this.tabs[index];
      if (tab) this.setActiveTab(tab.data.id);
    },
    closeActiveTab() {
      if (this.activeTabId) this.removeTab(this.activeTabId);
    },
    addTab() {},
  };

  useTabShortcuts(sessionTabs, { focused: isPanelFocused });
  useHotkey(getHotkeyRegistration('newConversation', keyboard), handleCreate, {
    enabled: newConversationHotkey !== null,
  });

  useEffect(() => {
    conversationTabs.setVisible(isActive);
    return () => {
      conversationTabs.setVisible(false);
    };
  }, [conversationTabs, isActive]);

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <TabbedPtyPanel<ConversationStore | TerminalStore>
          autoFocus={autoFocus}
          onFocusChange={(focused) => {
            setIsPanelFocused(focused);
            if (focused) provisioned.taskView.setFocusedRegion('main');
          }}
          store={sessionTabs}
          paneId="conversations"
          getSession={(s) => s.session}
          onEnterPress={
            shouldSetWorkingOnEnter
              ? (s) => {
                  if (s instanceof ConversationStore) s.setWorking();
                }
              : undefined
          }
          onInterruptPress={(s) => {
            if (s instanceof ConversationStore) s.clearWorking();
          }}
          mapShiftEnterToCtrlJ
          remoteConnectionId={remoteConnectionId}
          tabBar={
            <ConversationsTabs
              projectId={projectId}
              taskId={taskId}
              terminalTabs={terminalTabs}
              terminalMgr={terminalMgr}
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
                  Create session
                  <ShortcutHint settingsKey="newConversation" />
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
