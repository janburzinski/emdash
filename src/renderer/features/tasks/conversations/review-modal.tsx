import { observer } from 'mobx-react-lite';
import { useCallback, useState } from 'react';
import {
  AGENT_PROVIDER_IDS,
  AgentProviderId,
  isValidProviderId,
} from '@shared/agent-provider-registry';
import { getProjectStore } from '@renderer/features/projects/stores/project-selectors';
import { useAppSettingsKey } from '@renderer/features/settings/use-app-settings-key';
import { useAgentAutoApproveDefaults } from '@renderer/features/tasks/hooks/useAgentAutoApproveDefaults';
import { asProvisioned, getTaskStore } from '@renderer/features/tasks/stores/task-selectors';
import { AgentSelector } from '@renderer/lib/components/agent-selector/agent-selector';
import { BaseModalProps } from '@renderer/lib/modal/modal-provider';
import { getPaneContainer } from '@renderer/lib/pty/pane-sizing-context';
import { measureDimensions } from '@renderer/lib/pty/pty-dimensions';
import { appState } from '@renderer/lib/stores/app-state';
import { ConfirmButton } from '@renderer/lib/ui/confirm-button';
import {
  DialogContentArea,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/lib/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@renderer/lib/ui/field';
import { Textarea } from '@renderer/lib/ui/textarea';
import { nextDefaultConversationTitle } from './conversation-title-utils';
import { resolveConversationProviderSelection } from './provider-selection';

function getConversationsPaneSize() {
  const container = getPaneContainer('conversations');
  return container ? (measureDimensions(container, 8, 16) ?? undefined) : undefined;
}

export const ReviewModal = observer(function ReviewModal({
  onSuccess,
  projectId,
  taskId,
}: BaseModalProps<{ conversationId: string }> & {
  projectId: string;
  taskId: string;
}) {
  const [providerOverride, setProviderOverride] = useState<AgentProviderId | null>(null);
  const { value: defaultAgentValue } = useAppSettingsKey('defaultAgent');
  const { value: reviewPromptValue, defaults: reviewPromptDefault } =
    useAppSettingsKey('reviewPrompt');
  const initialPrompt = reviewPromptValue ?? reviewPromptDefault ?? '';
  const [prompt, setPrompt] = useState(initialPrompt);

  const defaultProviderId: AgentProviderId = isValidProviderId(defaultAgentValue)
    ? defaultAgentValue
    : 'claude';

  const projectData = getProjectStore(projectId)?.data;
  const connectionId = projectData?.type === 'ssh' ? projectData.connectionId : undefined;
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
  const conversationMgr = asProvisioned(getTaskStore(projectId, taskId))?.conversations;
  const autoApproveDefaults = useAgentAutoApproveDefaults();
  const skipPermissions = providerId ? autoApproveDefaults.getDefault(providerId) : false;
  const titleProviderId = providerId ?? defaultProviderId;
  const title = nextDefaultConversationTitle(
    titleProviderId,
    Array.from(conversationMgr?.conversations.values() ?? [], (conversation) => conversation.data)
  );

  const trimmedPrompt = prompt.trim();
  const submitDisabled = createDisabled || trimmedPrompt.length === 0;

  const handleStartReview = useCallback(() => {
    if (submitDisabled || !conversationMgr || !providerId) return;
    const id = crypto.randomUUID();
    void conversationMgr.createConversation({
      projectId,
      taskId,
      id,
      autoApprove: skipPermissions,
      provider: providerId,
      title,
      initialSize: getConversationsPaneSize(),
      initialPrompt: trimmedPrompt,
    });
    onSuccess({ conversationId: id });
  }, [
    submitDisabled,
    conversationMgr,
    providerId,
    title,
    onSuccess,
    projectId,
    taskId,
    skipPermissions,
    trimmedPrompt,
  ]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Review changes</DialogTitle>
      </DialogHeader>
      <DialogContentArea>
        <FieldGroup>
          <Field>
            <FieldLabel>Agent</FieldLabel>
            <AgentSelector
              value={providerId}
              onChange={setProviderOverride}
              connectionId={connectionId}
            />
          </Field>
          <Field>
            <FieldLabel>Prompt</FieldLabel>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-32 text-sm leading-relaxed"
              placeholder="Describe what the agent should review"
            />
          </Field>
        </FieldGroup>
      </DialogContentArea>
      <DialogFooter>
        <ConfirmButton onClick={handleStartReview} disabled={submitDisabled}>
          Start review
        </ConfirmButton>
      </DialogFooter>
    </>
  );
});
