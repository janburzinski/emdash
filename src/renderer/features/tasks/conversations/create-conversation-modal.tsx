import { Terminal } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useCallback, useState } from 'react';
import {
  AGENT_PROVIDER_IDS,
  isValidProviderId,
  type AgentProviderId,
} from '@shared/agent-provider-registry';
import { useAppSettingsKey } from '@renderer/features/settings/use-app-settings-key';
import { useAgentAutoApproveDefaults } from '@renderer/features/tasks/hooks/useAgentAutoApproveDefaults';
import { asProvisioned, getTaskStore } from '@renderer/features/tasks/stores/task-selectors';
import { AgentSelector } from '@renderer/lib/components/agent-selector/agent-selector';
import type { BaseModalProps } from '@renderer/lib/modal/modal-provider';
import { getPaneContainer } from '@renderer/lib/pty/pane-sizing-context';
import { measureDimensions } from '@renderer/lib/pty/pty-dimensions';
import { appState } from '@renderer/lib/stores/app-state';
import { AnimatedHeight } from '@renderer/lib/ui/animated-height';
import { Checkbox } from '@renderer/lib/ui/checkbox';
import { ConfirmButton } from '@renderer/lib/ui/confirm-button';
import {
  DialogContentArea,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/lib/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@renderer/lib/ui/field';
import { Switch } from '@renderer/lib/ui/switch';
import { log } from '@renderer/utils/logger';
import { nextTerminalName } from '../terminals/terminal-tabs';
import { nextDefaultConversationTitle } from './conversation-title-utils';
import { resolveConversationProviderSelection } from './provider-selection';

function getConversationsPaneSize() {
  const container = getPaneContainer('conversations');
  return container ? (measureDimensions(container, 8, 16) ?? undefined) : undefined;
}

type CreateSessionResult =
  | { type: 'conversation'; conversationId: string }
  | { type: 'terminal'; terminalId: string };

export const CreateConversationModal = observer(function CreateConversationModal({
  connectionId,
  onSuccess,
  projectId,
  taskId,
}: BaseModalProps<CreateSessionResult> & {
  connectionId?: string;
  projectId: string;
  taskId: string;
}) {
  const [terminalOnly, setTerminalOnly] = useState(false);
  const [providerOverride, setProviderOverride] = useState<AgentProviderId | null>(null);
  const { value: defaultAgentValue } = useAppSettingsKey('defaultAgent');
  const defaultProviderId: AgentProviderId = isValidProviderId(defaultAgentValue)
    ? defaultAgentValue
    : 'claude';

  const dependencyResource = connectionId
    ? appState.dependencies.getRemote(connectionId)
    : appState.dependencies.local;
  const availabilityKnown = dependencyResource.data !== null;
  const installedProviderIds = AGENT_PROVIDER_IDS.filter(
    (id) => dependencyResource.data?.[id]?.status === 'available'
  );
  const { providerId, createDisabled } = resolveConversationProviderSelection({
    defaultProviderId,
    providerOverride,
    installedProviderIds,
    availabilityKnown,
  });
  const provisionedTask = asProvisioned(getTaskStore(projectId, taskId));
  const conversationMgr = provisionedTask?.conversations;
  const terminalMgr = provisionedTask?.terminals;
  const terminalTabs = provisionedTask?.taskView.terminalTabs;

  const autoApproveDefaults = useAgentAutoApproveDefaults();
  const skipPermissions = providerId ? autoApproveDefaults.getDefault(providerId) : false;
  const titleProviderId = providerId ?? defaultProviderId;
  const title = nextDefaultConversationTitle(
    titleProviderId,
    Array.from(conversationMgr?.conversations.values() ?? [], (conversation) => conversation.data)
  );

  const handleCreateConversation = useCallback(() => {
    if (createDisabled || !conversationMgr || !providerId) return;
    const id = crypto.randomUUID();
    void conversationMgr.createConversation({
      projectId,
      taskId,
      id,
      autoApprove: skipPermissions,
      provider: providerId,
      title,
      initialSize: getConversationsPaneSize(),
    });
    onSuccess({ type: 'conversation', conversationId: id });
  }, [
    conversationMgr,
    createDisabled,
    providerId,
    title,
    onSuccess,
    projectId,
    taskId,
    skipPermissions,
  ]);

  const handleCreateTerminal = useCallback(async () => {
    if (!terminalMgr || !terminalTabs || !provisionedTask) return;
    const id = crypto.randomUUID();
    const name = nextTerminalName(terminalTabs.tabs.map((s) => s.data.name));
    await terminalMgr.createTerminal({
      id,
      projectId,
      taskId,
      name,
      initialSize: getConversationsPaneSize(),
    });
    terminalTabs.setActiveTab(id);
    provisionedTask.taskView.setView('agents');
    provisionedTask.taskView.setFocusedRegion('main');
    onSuccess({ type: 'terminal', terminalId: id });
  }, [terminalMgr, terminalTabs, provisionedTask, projectId, taskId, onSuccess]);

  const handleCreate = () => {
    if (!terminalOnly) {
      handleCreateConversation();
      return;
    }
    void handleCreateTerminal().catch((error) => {
      log.error('Failed to create terminal:', error);
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create Session</DialogTitle>
      </DialogHeader>
      <DialogContentArea>
        <FieldGroup>
          <AnimatedHeight>
            {terminalOnly ? (
              <div className="rounded-md bg-background-2 px-3 py-2.5 text-xs leading-5 text-foreground-muted">
                <div className="flex items-start gap-2">
                  <Terminal className="mt-0.5 size-3.5 shrink-0" />
                  <span>Creates a reusable terminal tab in this task’s main session area.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Field>
                  <FieldLabel>Agent</FieldLabel>
                  <AgentSelector
                    value={providerId}
                    onChange={setProviderOverride}
                    connectionId={connectionId}
                  />
                </Field>
                <Field>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={skipPermissions}
                      disabled={
                        !providerId || autoApproveDefaults.loading || autoApproveDefaults.saving
                      }
                      onCheckedChange={(checked) => {
                        if (providerId) autoApproveDefaults.setDefault(providerId, checked);
                      }}
                    />
                    <FieldLabel>Dangerously skip permissions</FieldLabel>
                  </div>
                </Field>
              </div>
            )}
          </AnimatedHeight>
          <label className="flex cursor-pointer items-start gap-3 rounded-md px-0.5 py-1">
            <Checkbox
              checked={terminalOnly}
              onCheckedChange={(checked) => setTerminalOnly(checked === true)}
            />
            <span className="grid gap-1">
              <span className="text-sm text-foreground">Terminal only</span>
              <span className="text-xs leading-5 text-foreground-muted">
                Open a normal shell instead of starting an agent conversation.
              </span>
            </span>
          </label>
        </FieldGroup>
      </DialogContentArea>
      <DialogFooter>
        <ConfirmButton
          onClick={handleCreate}
          disabled={terminalOnly ? !terminalMgr : createDisabled}
        >
          Create
        </ConfirmButton>
      </DialogFooter>
    </>
  );
});
