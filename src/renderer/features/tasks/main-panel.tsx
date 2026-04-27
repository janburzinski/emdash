import { Loader2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { Activity } from 'react';
import {
  getTaskStore,
  taskErrorMessage,
  taskViewKind,
} from '@renderer/features/tasks/stores/task-selectors';
import { useProvisionedTask, useTaskViewContext } from '@renderer/features/tasks/task-view-context';
import { ConversationsPanel } from './conversations/conversations-panel';
import { DiffView } from './diff-view/main-panel/diff-view';
import { EditorMainPanel } from './editor/editor-main-panel';

export const TaskMainPanel = observer(function TaskMainPanel({
  allowEditor = true,
  allowShortcuts = true,
  conversationPaneId = 'conversations',
  blockedConversationIds,
  conversationId,
  onConversationCreated,
}: {
  allowEditor?: boolean;
  allowShortcuts?: boolean;
  conversationPaneId?: string;
  blockedConversationIds?: readonly string[];
  conversationId?: string | null;
  onConversationCreated?: (conversationId: string) => void;
}) {
  const { projectId, taskId } = useTaskViewContext();
  const taskStore = getTaskStore(projectId, taskId);
  const kind = taskViewKind(taskStore, projectId);

  if (kind === 'creating') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-foreground-muted" />
        <p className="text-xs font-mono text-foreground-muted">Creating task</p>
      </div>
    );
  }

  if (kind === 'create-error') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8">
        <div className="flex max-w-xs flex-col items-center text-center gap-2">
          <p className="text-sm font-medium font-mono text-foreground-destructive">
            Error creating task
          </p>
          <p className="text-xs font-mono text-foreground-passive">{taskErrorMessage(taskStore)}</p>
        </div>
      </div>
    );
  }

  if (kind === 'project-mounting' || kind === 'provisioning') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-foreground-muted" />
        <p className="text-xs font-mono text-foreground-muted">Setting up workspace…</p>
      </div>
    );
  }

  if (kind === 'provision-error' || kind === 'project-error') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8">
        <div className="flex max-w-xs flex-col items-center text-center gap-2">
          <p className="text-sm font-medium font-mono text-foreground-destructive">
            Failed to set up workspace
          </p>
          <p className="text-xs font-mono text-foreground-muted">{taskErrorMessage(taskStore)}</p>
        </div>
      </div>
    );
  }

  if (kind === 'idle' || kind === 'teardown') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-foreground-muted" />
        <p className="text-xs font-mono text-foreground-muted">Setting up workspace…</p>
      </div>
    );
  }

  if (kind === 'teardown-error') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8">
        <div className="flex max-w-xs flex-col items-center text-center gap-2">
          <p className="text-sm font-medium font-mono text-foreground-destructive">
            Failed to tear down workspace
          </p>
          <p className="text-xs font-mono text-foreground-muted">{taskErrorMessage(taskStore)}</p>
        </div>
      </div>
    );
  }

  if (kind === 'missing') {
    return null;
  }

  return (
    <ReadyTaskMainPanel
      allowEditor={allowEditor}
      allowShortcuts={allowShortcuts}
      conversationPaneId={conversationPaneId}
      blockedConversationIds={blockedConversationIds}
      conversationId={conversationId}
      onConversationCreated={onConversationCreated}
    />
  );
});

const ReadyTaskMainPanel = observer(function ReadyTaskMainPanel({
  allowEditor,
  allowShortcuts,
  conversationPaneId,
  blockedConversationIds,
  conversationId,
  onConversationCreated,
}: {
  allowEditor: boolean;
  allowShortcuts: boolean;
  conversationPaneId: string;
  blockedConversationIds?: readonly string[];
  conversationId?: string | null;
  onConversationCreated?: (conversationId: string) => void;
}) {
  const { taskView } = useProvisionedTask();

  return (
    <>
      <Activity mode={taskView.view === 'agents' ? 'visible' : 'hidden'}>
        <ConversationsPanel
          allowShortcuts={allowShortcuts}
          paneId={conversationPaneId}
          blockedConversationIds={blockedConversationIds}
          conversationId={conversationId}
          onConversationCreated={onConversationCreated}
        />
      </Activity>
      {allowEditor && (
        <Activity mode={taskView.view === 'editor' ? 'visible' : 'hidden'}>
          <EditorMainPanel />
        </Activity>
      )}
      <Activity mode={taskView.view === 'diff' ? 'visible' : 'hidden'}>
        <DiffView />
      </Activity>
    </>
  );
});
