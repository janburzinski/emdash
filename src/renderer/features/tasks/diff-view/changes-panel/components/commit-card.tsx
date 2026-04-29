import { CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { toast } from 'sonner';
import type { CommitMessageAgentId } from '@shared/commit-message';
import { useAppSettingsKey } from '@renderer/features/settings/use-app-settings-key';
import { useProvisionedTask } from '@renderer/features/tasks/task-view-context';
import { Button } from '@renderer/lib/ui/button';
import { Input } from '@renderer/lib/ui/input';
import { SplitButton, type SplitButtonAction } from '@renderer/lib/ui/split-button';
import { Textarea } from '@renderer/lib/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/lib/ui/tooltip';

type CommitPhase = 'idle' | 'committing' | 'commit-only-done' | 'committed' | 'pushing' | 'pushed';

interface CommitCardProps {
  autoStage?: boolean;
}

export const CommitCard = observer(function CommitCard({ autoStage = false }: CommitCardProps) {
  const provisioned = useProvisionedTask();
  const git = provisioned.workspace.git;
  const changesView = provisioned.taskView.diffView.changesView;
  const hasPRs = changesView.expandedSections.pullRequests;
  const { value: commitSettings } = useAppSettingsKey('commitMessage');
  const aiAgent = commitSettings?.agent ?? null;
  const [commitMessage, setCommitMessage] = useState('');
  const [description, setDescription] = useState('');
  const [phase, setPhase] = useState<CommitPhase>('idle');
  const [isGenerating, setIsGenerating] = useState(false);
  const fullMessage = description ? `${commitMessage}\n\n${description}` : commitMessage;
  const isInFlight = phase !== 'idle';

  const generateMessage = async () => {
    if (!aiAgent || isGenerating || isInFlight) return;
    setIsGenerating(true);
    try {
      const result = await git.generateCommitMessage();
      if (!result.success) {
        toast.error(commitMessageErrorLabel(result.error));
        return;
      }
      setCommitMessage(result.data.title);
      setDescription(result.data.description);
    } finally {
      setIsGenerating(false);
    }
  };

  const doCommit = async () => {
    setPhase('committing');
    if (autoStage) {
      changesView.suppressNextAutoExpand('staged');
      await git.stageAllFiles();
    }
    const result = await git.commit(fullMessage);
    if (!result.success) {
      setPhase('idle');
      return;
    }
    setCommitMessage('');
    setDescription('');
    if (!autoStage) {
      changesView.setExpanded({ unstaged: true, staged: false, pullRequests: hasPRs });
    }
    setPhase('commit-only-done');
    setTimeout(() => setPhase('idle'), 3000);
  };

  const doCommitAndPush = async () => {
    setPhase('committing');
    if (autoStage) {
      changesView.suppressNextAutoExpand('staged');
      await git.stageAllFiles();
    }
    const commitResult = await git.commit(fullMessage);
    if (!commitResult.success) {
      setPhase('idle');
      return;
    }
    setCommitMessage('');
    setDescription('');
    if (!autoStage) {
      changesView.setExpanded({ unstaged: true, staged: false, pullRequests: hasPRs });
    }
    setPhase('committed');
    await new Promise((r) => setTimeout(r, 1000));
    setPhase('pushing');
    const pushResult = await git.push();
    if (!pushResult.success) {
      setPhase('idle');
      return;
    }
    setPhase('pushed');
    setTimeout(() => setPhase('idle'), 3000);
  };

  const actions: SplitButtonAction[] = [
    { value: 'commit', label: 'Commit', action: doCommit },
    { value: 'commit-push', label: 'Commit & Push', action: doCommitAndPush },
  ];

  const diffView = provisioned.taskView.diffView;

  return (
    <div className="shrink-0 mx-2 mb-2 flex flex-col gap-2 items-center justify-between rounded-xl border border-border bg-background-1 p-2">
      <div className="relative w-full">
        <Input
          placeholder="Commit message"
          autoFocus
          className={`w-full bg-background ${aiAgent ? 'pr-9' : ''}`}
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          disabled={isInFlight}
        />
        {aiAgent && (
          <Tooltip>
            <TooltipTrigger
              className="absolute right-1 top-1/2 -translate-y-1/2"
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={generateMessage}
                  disabled={isInFlight || isGenerating}
                  className="size-7"
                  aria-label="Generate commit message with AI"
                >
                  {isGenerating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                </Button>
              }
            />
            <TooltipContent>Generate with {agentLabel(aiAgent)}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <Textarea
        placeholder="Description"
        className="w-full bg-background"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={isInFlight}
      />
      {phase === 'idle' && (
        <SplitButton
          actions={actions}
          size="sm"
          className="w-full"
          disabled={!commitMessage.trim()}
          defaultValue={diffView.effectiveCommitAction}
          onValueChange={(value) => diffView.setCommitAction(value as 'commit' | 'commit-push')}
        />
      )}
      {phase === 'committing' && (
        <StatusRow icon={<Loader2 className="size-4 animate-spin" />} label="Committing…" />
      )}
      {(phase === 'commit-only-done' || phase === 'committed') && (
        <StatusRow icon={<CheckCircle className="size-4 text-green-500" />} label="Committed" />
      )}
      {phase === 'pushing' && (
        <StatusRow icon={<Loader2 className="size-4 animate-spin" />} label="Pushing…" />
      )}
      {phase === 'pushed' && (
        <StatusRow icon={<CheckCircle className="size-4 text-green-500" />} label="Pushed" />
      )}
    </div>
  );
});

function agentLabel(agent: CommitMessageAgentId): string {
  switch (agent) {
    case 'codex':
      return 'Codex';
    case 'claude':
      return 'Claude Code';
    case 'opencode':
      return 'OpenCode';
  }
}

function commitMessageErrorLabel(error: {
  type: string;
  message?: string;
  agent?: string;
}): string {
  switch (error.type) {
    case 'no_changes':
      return 'No changes to summarize';
    case 'not_configured':
      return 'No commit message agent configured. Set one in Settings → Agents.';
    case 'agent_not_found':
      return `Agent "${error.agent}" not installed or not on PATH`;
    case 'agent_timeout':
      return `Agent "${error.agent}" timed out`;
    case 'empty_response':
      return `Agent "${error.agent}" returned no message`;
    default:
      return error.message ?? 'Failed to generate commit message';
  }
}

function StatusRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex w-full items-center justify-center gap-2 py-1 text-sm text-foreground-muted">
      {icon}
      <span>{label}</span>
    </div>
  );
}
