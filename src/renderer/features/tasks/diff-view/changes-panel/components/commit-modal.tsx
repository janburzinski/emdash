import { WarningCircle as CircleAlert, Sparkle } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useProvisionedTask } from '@renderer/features/tasks/task-view-context';
import { rpc } from '@renderer/lib/ipc';
import { type BaseModalProps } from '@renderer/lib/modal/modal-provider';
import { Alert, AlertDescription, AlertTitle } from '@renderer/lib/ui/alert';
import { Button } from '@renderer/lib/ui/button';
import { ConfirmButton } from '@renderer/lib/ui/confirm-button';
import {
  DialogContentArea,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/lib/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@renderer/lib/ui/field';
import { SplitButton, type SplitButtonAction } from '@renderer/lib/ui/split-button';
import { Textarea } from '@renderer/lib/ui/textarea';

export type CommitModalArgs = {
  projectId: string;
  workspaceId: string;
};

type Props = BaseModalProps<void> & CommitModalArgs;

export const CommitModal = observer(function CommitModal({
  projectId,
  workspaceId,
  onSuccess,
  onClose,
}: Props) {
  const provisioned = useProvisionedTask();
  const git = provisioned.workspace.git;
  const stagedCount = git.stagedFileChanges.length;
  const unstagedCount = git.unstagedFileChanges.length;
  const hasStaged = stagedCount > 0;

  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  const generate = async () => {
    setError(null);
    setIsGenerating(true);
    try {
      if (git.stagedFileChanges.length === 0 && git.unstagedFileChanges.length > 0) {
        await git.stageAllFiles();
      }
      if (git.stagedFileChanges.length === 0) {
        setError('No changes staged. Stage files before generating a commit message.');
        return;
      }
      const result = await rpc.ai.generateCommitMessage(projectId, workspaceId);
      if (!result.success) {
        setError(
          result.error.type === 'no_staged_changes'
            ? 'No changes staged.'
            : 'message' in result.error
              ? result.error.message
              : 'Failed to generate commit message'
        );
        return;
      }
      setMessage(result.data.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const doCommit = async (push: boolean) => {
    if (!message.trim()) return;
    setError(null);
    setIsCommitting(true);
    try {
      if (!hasStaged && unstagedCount > 0) {
        await git.stageAllFiles();
      }
      const result = await git.commit(message.trim());
      if (!result.success) {
        setError('type' in result.error ? result.error.type : 'Failed to commit');
        return;
      }
      if (push) {
        const pushResult = await git.push();
        if (!pushResult.success) {
          setError(
            'type' in pushResult.error ? pushResult.error.type : 'Commit succeeded but push failed'
          );
          return;
        }
      }
      onSuccess();
    } finally {
      setIsCommitting(false);
    }
  };

  const actions: SplitButtonAction[] = [
    { value: 'commit', label: 'Commit', action: () => void doCommit(false) },
    { value: 'commit-push', label: 'Commit & Push', action: () => void doCommit(true) },
  ];

  const noChanges = stagedCount === 0 && unstagedCount === 0;
  const summary = hasStaged
    ? `${stagedCount} staged file${stagedCount === 1 ? '' : 's'}`
    : unstagedCount > 0
      ? `${unstagedCount} unstaged file${unstagedCount === 1 ? '' : 's'} — will be staged on commit`
      : 'No changes';

  return (
    <div className="flex flex-col overflow-hidden max-h-[70vh]">
      <DialogHeader>
        <DialogTitle>Commit Changes</DialogTitle>
      </DialogHeader>
      <DialogContentArea className="space-y-4">
        <p className="text-sm text-foreground-muted">{summary}</p>
        <FieldGroup>
          <Field>
            <FieldLabel>Message</FieldLabel>
            <Textarea
              placeholder="Commit message"
              autoFocus
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              disabled={isCommitting || isGenerating}
            />
          </Field>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void generate()}
            disabled={isGenerating || isCommitting || noChanges}
            className="self-start"
          >
            <Sparkle className="size-3.5" />
            {isGenerating ? 'Generating with Codex…' : 'Generate with Codex'}
          </Button>
        </FieldGroup>
        {error && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </DialogContentArea>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isCommitting}>
          Cancel
        </Button>
        {unstagedCount > 0 && !hasStaged ? (
          <ConfirmButton
            size="sm"
            onClick={() => void doCommit(false)}
            disabled={!message.trim() || isCommitting || noChanges}
          >
            {isCommitting ? 'Committing…' : 'Stage all & Commit'}
          </ConfirmButton>
        ) : (
          <SplitButton
            actions={actions}
            size="sm"
            disabled={!message.trim() || noChanges}
            loading={isCommitting}
            loadingLabel="Committing…"
          />
        )}
      </DialogFooter>
    </div>
  );
});
