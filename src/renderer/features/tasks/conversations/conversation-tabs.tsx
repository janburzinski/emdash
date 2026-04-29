import { Plus, Terminal } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { asMounted, getProjectStore } from '@renderer/features/projects/stores/project-selectors';
import { AgentStatusIndicator } from '@renderer/features/tasks/components/agent-status-indicator';
import { ConversationStore } from '@renderer/features/tasks/conversations/conversation-manager';
import { useProvisionedTask } from '@renderer/features/tasks/task-view-context';
import {
  TerminalStore,
  type TerminalManagerStore,
} from '@renderer/features/tasks/terminals/terminal-manager';
import type { TerminalTabViewStore } from '@renderer/features/tasks/terminals/terminal-tab-view-store';
import AgentLogo from '@renderer/lib/components/agent-logo';
import { useShowModal } from '@renderer/lib/modal/modal-provider';
import { ShortcutHint } from '@renderer/lib/ui/shortcut-hint';
import { TabBar } from '@renderer/lib/ui/tab-bar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/lib/ui/tooltip';
import { agentConfig } from '@renderer/utils/agentConfig';
import { formatConversationTitleForDisplay } from './conversation-title-utils';

export const ConversationsTabs = observer(function ConversationsTabs({
  projectId,
  taskId,
  terminalMgr,
  terminalTabs,
}: {
  projectId: string;
  taskId: string;
  terminalMgr: TerminalManagerStore;
  terminalTabs: TerminalTabViewStore;
}) {
  const provisioned = useProvisionedTask();
  const conversationMgr = provisioned.conversations;
  const conversationTabs = provisioned.taskView.conversationTabs;
  const showCreateConversationModal = useShowModal('createConversationModal');
  const mountedProject = asMounted(getProjectStore(projectId));
  const connectionId =
    mountedProject?.data.type === 'ssh' ? mountedProject.data.connectionId : undefined;

  const tabs = [...conversationTabs.tabs, ...terminalTabs.tabs];

  return (
    <TabBar<ConversationStore | TerminalStore>
      tabs={tabs}
      activeTabId={conversationTabs.activeTabId}
      getId={(s) => s.data.id}
      getLabel={(s) =>
        s instanceof ConversationStore
          ? formatConversationTitleForDisplay(s.data.providerId, s.data.title)
          : s.data.name
      }
      onSelect={(id) => {
        conversationTabs.setActiveTab(id);
        if (terminalMgr.terminals.has(id)) terminalTabs.setActiveTab(id);
      }}
      onRemove={(id) => {
        if (terminalMgr.terminals.has(id)) {
          terminalTabs.removeTab(id);
        } else {
          conversationTabs.removeTab(id);
        }
      }}
      renderTabPrefix={(s) => {
        if (s instanceof TerminalStore) return <Terminal className="size-3" />;
        const config = agentConfig[s.data.providerId];
        return (
          <AgentLogo
            logo={config.logo}
            alt={config.alt}
            isSvg={config.isSvg}
            invertInDark={config.invertInDark}
            className="size-4"
          />
        );
      }}
      renderTabSuffix={(s) =>
        s instanceof ConversationStore ? (
          <AgentStatusIndicator status={s.indicatorStatus} disableTooltip />
        ) : null
      }
      onRename={(id, name) => {
        if (terminalMgr.terminals.has(id)) {
          void terminalMgr.renameTerminal(id, name);
        } else {
          void conversationMgr.renameConversation(id, name);
        }
      }}
      onReorder={(from, to) => conversationTabs.reorderTabs(from, to)}
      actions={
        <Tooltip>
          <TooltipTrigger>
            <button
              className="size-10 justify-center items-center flex border-l hover:bg-background text-foreground-muted hover:text-foreground"
              onClick={() =>
                showCreateConversationModal({
                  connectionId,
                  projectId,
                  taskId,
                  onSuccess: (result) => {
                    if (result.type === 'conversation') {
                      conversationTabs.setActiveTab(result.conversationId);
                    } else {
                      conversationTabs.setActiveTab(result.terminalId);
                      terminalTabs.setActiveTab(result.terminalId);
                    }
                  },
                })
              }
            >
              <Plus className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            Create session
            <ShortcutHint settingsKey="newConversation" />
          </TooltipContent>
        </Tooltip>
      }
    />
  );
});
