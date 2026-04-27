import { ArrowUp, ChevronDown, FolderOpen, GitBranch, Mic, Plus, Zap } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useCallback, useMemo, useState } from 'react';
import { AgentProviderId, isValidProviderId } from '@shared/agent-provider-registry';
import type { Branch } from '@shared/git';
import {
  asMounted,
  getProjectManagerStore,
  getRepositoryStore,
} from '@renderer/features/projects/stores/project-selectors';
import { useAppSettingsKey } from '@renderer/features/settings/use-app-settings-key';
import { ProjectSelector } from '@renderer/features/tasks/create-task-modal/project-selector';
import { AgentSelector } from '@renderer/lib/components/agent-selector/agent-selector';
import { ProjectBranchSelector } from '@renderer/lib/components/project-branch-selector';
import { useNavigate } from '@renderer/lib/layout/navigation-provider';
import { appState } from '@renderer/lib/stores/app-state';
import { Button } from '@renderer/lib/ui/button';
import { ComboboxTrigger, ComboboxValue } from '@renderer/lib/ui/combobox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@renderer/lib/ui/dropdown-menu';
import { Textarea } from '@renderer/lib/ui/textarea';
import { ensureUniqueTaskName, normalizeTaskName } from '@renderer/utils/taskNames';

function deriveTaskNameFromPrompt(prompt: string, existingNames: Iterable<string>): string {
  const firstLine = prompt.trim().split('\n')[0] ?? '';
  const base = normalizeTaskName(firstLine) || 'task';
  return ensureUniqueTaskName(base, existingNames);
}

export const HomeChatbox = observer(function HomeChatbox() {
  const { navigate } = useNavigate();
  const { value: defaultAgentValue } = useAppSettingsKey('defaultAgent');
  const { value: localProject } = useAppSettingsKey('localProject');
  const pushOnCreateByDefault = localProject?.pushOnCreate ?? true;

  const mountedProjects = Array.from(getProjectManagerStore().projects.entries()).flatMap(
    ([id, store]) => {
      const mounted = asMounted(store);
      return mounted ? [{ id, store: mounted }] : [];
    }
  );

  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(() => {
    return mountedProjects.at(-1)?.id;
  });
  const [providerOverride, setProviderOverride] = useState<AgentProviderId | null>(null);
  const [createWorktree, setCreateWorktree] = useState(true);
  const [branchOverride, setBranchOverride] = useState<
    { projectId: string; branch: Branch } | undefined
  >(undefined);
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const projectStore = selectedProjectId
    ? getProjectManagerStore().projects.get(selectedProjectId)
    : undefined;
  const mountedProject = asMounted(projectStore);
  const repo = selectedProjectId ? getRepositoryStore(selectedProjectId) : undefined;
  const defaultBranch = repo?.defaultBranch;
  const currentBranch = repo?.currentBranch ?? null;
  const isUnborn = repo?.isUnborn ?? false;

  const connectionId =
    mountedProject?.data.type === 'ssh' ? mountedProject.data.connectionId : undefined;
  const installedAgents = connectionId
    ? appState.dependencies.remoteInstalledAgents(connectionId)
    : appState.dependencies.localInstalledAgents;
  const installedAgentSet = useMemo(() => new Set(installedAgents), [installedAgents]);

  const fallbackProvider: AgentProviderId = isValidProviderId(defaultAgentValue)
    ? defaultAgentValue
    : 'claude';
  const providerId: AgentProviderId | null = (() => {
    if (providerOverride && installedAgentSet.has(providerOverride)) return providerOverride;
    if (installedAgentSet.has(fallbackProvider)) return fallbackProvider;
    const first = installedAgents[0];
    return first && isValidProviderId(first) ? first : null;
  })();

  const effectiveCreateWorktree = isUnborn ? false : createWorktree;
  const activeBranchOverride =
    branchOverride && branchOverride.projectId === selectedProjectId
      ? branchOverride.branch
      : undefined;
  const sourceBranch = useMemo<Branch | undefined>(() => {
    if (activeBranchOverride) return activeBranchOverride;
    if (effectiveCreateWorktree) return defaultBranch;
    if (currentBranch) return { type: 'local', branch: currentBranch };
    return defaultBranch;
  }, [activeBranchOverride, effectiveCreateWorktree, defaultBranch, currentBranch]);

  const canSubmit =
    !!selectedProjectId &&
    !!mountedProject &&
    !!providerId &&
    !!sourceBranch &&
    prompt.trim().length > 0 &&
    !submitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !selectedProjectId || !mountedProject || !providerId || !sourceBranch) {
      return;
    }
    setSubmitting(true);
    const taskId = crypto.randomUUID();
    const conversationId = crypto.randomUUID();
    const taskManager = mountedProject.taskManager;
    const existingNames = Array.from(taskManager.tasks.values(), (t) => t.data.name).filter(
      (name): name is string => typeof name === 'string'
    );
    const taskName = deriveTaskNameFromPrompt(prompt, existingNames);

    const strategy = effectiveCreateWorktree
      ? ({
          kind: 'new-branch',
          taskBranch: taskName,
          pushBranch: pushOnCreateByDefault,
        } as const)
      : ({ kind: 'no-worktree' } as const);

    try {
      await taskManager.createTask({
        id: taskId,
        projectId: selectedProjectId,
        name: taskName,
        sourceBranch,
        strategy,
        initialConversation: {
          id: conversationId,
          projectId: selectedProjectId,
          taskId,
          provider: providerId,
          title: 'Conversation 1',
          initialPrompt: prompt.trim(),
        },
      });
      navigate('task', { projectId: selectedProjectId, taskId });
      setPrompt('');
    } catch (e) {
      console.error('Failed to create task from home chatbox', e);
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    selectedProjectId,
    mountedProject,
    providerId,
    sourceBranch,
    prompt,
    effectiveCreateWorktree,
    pushOnCreateByDefault,
    navigate,
  ]);

  if (mountedProjects.length === 0) return null;

  const ModeIcon = effectiveCreateWorktree ? GitBranch : Zap;
  const modeLabel = effectiveCreateWorktree ? 'Worktree' : 'Direct';

  return (
    <div className="mx-auto w-full max-w-[640px]">
      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe a task and start it directly..."
          rows={1}
          className="min-h-[52px] resize-none border-0 bg-transparent px-3 py-2.5 text-sm shadow-none hover:border-0 focus-visible:border-0 focus-visible:ring-0"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void handleSubmit();
            }
          }}
        />
        <div className="flex items-center gap-1 px-1.5 pb-1.5">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Add attachment"
            className="text-foreground-muted"
          >
            <Plus className="size-4" />
          </Button>
          <div className="min-w-[140px] max-w-[180px]">
            <AgentSelector
              value={providerId}
              onChange={setProviderOverride}
              connectionId={connectionId}
              className="[&_button]:h-7 [&_button]:rounded-md [&_button]:border-0 [&_button]:px-2 [&_button]:text-xs [&_button]:hover:bg-background-1"
            />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Voice input"
              className="text-foreground-muted"
            >
              <Mic className="size-4" />
            </Button>
            <Button
              size="icon-sm"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              aria-label="Start task"
              className="rounded-full"
            >
              <ArrowUp className="size-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-1 border-t border-border bg-background-1 px-1.5 py-1">
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={isUnborn}
              className="flex h-7 min-w-0 items-center gap-1.5 rounded-md px-2 text-xs text-foreground-muted outline-none hover:bg-background-2 data-popup-open:bg-background-2 disabled:opacity-50"
            >
              <ModeIcon className="size-3.5 shrink-0" />
              <span>{modeLabel}</span>
              <ChevronDown className="size-3 shrink-0 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem onClick={() => setCreateWorktree(true)}>
                <GitBranch className="size-3.5 shrink-0" />
                <div className="flex flex-col">
                  <span>Worktree</span>
                  <span className="text-xs text-foreground-muted">Isolated branch + folder</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCreateWorktree(false)}>
                <Zap className="size-3.5 shrink-0" />
                <div className="flex flex-col">
                  <span>Direct</span>
                  <span className="text-xs text-foreground-muted">Run on current branch</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ProjectSelector
            value={selectedProjectId}
            onChange={setSelectedProjectId}
            trigger={
              <ComboboxTrigger className="flex h-7 min-w-0 items-center gap-1.5 rounded-md px-2 text-xs text-foreground-muted outline-none hover:bg-background-2">
                <FolderOpen className="size-3.5 shrink-0 text-foreground-muted" />
                <ComboboxValue placeholder="Project" />
                <ChevronDown className="size-3 shrink-0 opacity-60" />
              </ComboboxTrigger>
            }
          />
          {selectedProjectId && (
            <ProjectBranchSelector
              projectId={selectedProjectId}
              value={sourceBranch}
              onValueChange={(branch) =>
                setBranchOverride({ projectId: selectedProjectId, branch })
              }
              trigger={
                <ComboboxTrigger className="flex h-7 min-w-0 items-center gap-1.5 rounded-md px-2 text-xs text-foreground-muted outline-none hover:bg-background-2">
                  <GitBranch className="size-3.5 shrink-0" />
                  <span className="truncate">
                    {sourceBranch?.branch ?? currentBranch ?? 'branch'}
                  </span>
                  <ChevronDown className="size-3 shrink-0 opacity-60" />
                </ComboboxTrigger>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
});
