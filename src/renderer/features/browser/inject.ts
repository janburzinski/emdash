import {
  asProvisioned,
  getRegisteredTaskData,
  getTaskStore,
} from '@renderer/features/tasks/stores/task-selectors';
import { toast } from '@renderer/lib/hooks/use-toast';
import { rpc } from '@renderer/lib/ipc';
import { pastePromptInjection } from '@renderer/lib/pty/prompt-injection';
import { appState } from '@renderer/lib/stores/app-state';
import { formatAnnotationsAsMarkdown } from './format';
import type { Annotation } from './types';

export type InjectTarget = {
  projectId: string;
  taskId: string;
  taskName: string | undefined;
};

export function getActiveTaskTarget(): InjectTarget | null {
  const params = appState.navigation.viewParamsStore.task;
  if (!params || !params.projectId || !params.taskId) return null;
  const data = getRegisteredTaskData(params.projectId, params.taskId);
  return {
    projectId: params.projectId,
    taskId: params.taskId,
    taskName: data?.name,
  };
}

export async function sendAnnotationsToActiveTask(annotations: Annotation[]): Promise<boolean> {
  if (annotations.length === 0) return false;

  const target = getActiveTaskTarget();
  if (!target) {
    toast({
      title: 'No target task',
      description: 'Open a task first so annotations have somewhere to go.',
      variant: 'destructive',
    });
    return false;
  }

  const provisioned = asProvisioned(getTaskStore(target.projectId, target.taskId));
  if (!provisioned) {
    toast({
      title: 'Task not ready',
      description: 'The selected task is not yet provisioned.',
      variant: 'destructive',
    });
    return false;
  }

  const activeConversation = provisioned.taskView.conversationTabs.activeTab;
  if (!activeConversation) {
    toast({
      title: 'No active conversation',
      description: 'Open or create a conversation in the target task first.',
      variant: 'destructive',
    });
    return false;
  }

  const sessionId = activeConversation.session.sessionId;
  const providerId = activeConversation.data.providerId;
  const text = formatAnnotationsAsMarkdown(annotations);

  try {
    await pastePromptInjection({
      providerId,
      text,
      sendInput: (data) => rpc.pty.sendInput(sessionId, data),
    });
    toast({
      title: 'Sent to agent',
      description: target.taskName
        ? `Pasted ${annotations.length} annotation${annotations.length === 1 ? '' : 's'} into ${target.taskName}.`
        : `Pasted ${annotations.length} annotation${annotations.length === 1 ? '' : 's'} into the active task.`,
    });
    return true;
  } catch (error) {
    toast({
      title: 'Inject failed',
      description: error instanceof Error ? error.message : String(error),
      variant: 'destructive',
    });
    return false;
  }
}
