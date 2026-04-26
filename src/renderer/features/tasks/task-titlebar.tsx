import {
  ArrowDown,
  ArrowUp,
  CaretDown as ChevronDown,
  FileText as FileDiff,
  Files,
  GitBranch,
  ChatCircle as MessageSquare,
  PushPin as Pin,
  ArrowsCounterClockwise as RefreshCcw,
} from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import {
  asMounted,
  getProjectStore,
  projectDisplayName,
} from '@renderer/features/projects/stores/project-selectors';
import {
  getRegisteredTaskData,
  getTaskStore,
  taskDisplayName,
  taskViewKind,
} from '@renderer/features/tasks/stores/task-selectors';
import { useProvisionedTask, useTaskViewContext } from '@renderer/features/tasks/task-view-context';
import { OpenInMenu } from '@renderer/lib/components/titlebar/open-in-menu';
import { Titlebar } from '@renderer/lib/components/titlebar/Titlebar';
import { useDelayedBoolean } from '@renderer/lib/hooks/use-delay-boolean';
import { Badge } from '@renderer/lib/ui/badge';
import { Button } from '@renderer/lib/ui/button';
import { MicroLabel } from '@renderer/lib/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/lib/ui/popover';
import { ShortcutHint } from '@renderer/lib/ui/shortcut-hint';
import { ToggleGroup, ToggleGroupItem } from '@renderer/lib/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/lib/ui/tooltip';
import { cn } from '@renderer/utils/utils';
import { DevServerPills } from './components/dev-server-pills';
import { IssueSelector } from './components/issue-selector/issue-selector';
import { useTaskViewNavigation } from './hooks/use-task-view-navigation';
import { useTaskViewShortcuts } from './hooks/use-task-view-shortcuts';
import { useGitActions } from './use-git-actions';

export const TaskTitlebar = observer(function TaskTitlebar() {
  const { projectId, taskId } = useTaskViewContext();
  const taskStore = getTaskStore(projectId, taskId);
  const kind = taskViewKind(taskStore, projectId);

  if (kind !== 'ready') {
    return <PendingTaskTitlebar taskId={taskId} projectId={projectId} />;
  }

  return <ActiveTaskTitlebar taskId={taskId} projectId={projectId} />;
});

const PendingTaskTitlebar = observer(function PendingTaskTitlebar({
  taskId,
  projectId,
}: {
  taskId: string;
  projectId: string;
}) {
  const taskStore = getTaskStore(projectId, taskId)!;
  const projectName = projectDisplayName(getProjectStore(projectId));
  const name = taskDisplayName(taskStore);

  return (
    <Titlebar
      leftSlot={
        <div className="flex items-center gap-1 px-2 text-sm text-foreground-muted">
          <span className="flex items-center gap-1">
            <span className="text-sm text-foreground-passive">{projectName}</span>
            <span className="text-sm text-foreground-passive">/</span>
            {name}
          </span>
        </div>
      }
    />
  );
});

const ActiveTaskTitlebar = observer(function ActiveTaskTitlebar({
  projectId,
  taskId,
}: {
  projectId: string;
  taskId: string;
}) {
  const taskStore = getTaskStore(projectId, taskId)!;
  const taskPayload = getRegisteredTaskData(projectId, taskId)!;
  const provisionedTask = useProvisionedTask();
  const { taskView } = provisionedTask;
  const { view } = taskView;
  const { openAgentsView, openEditorView, openDiffView, isPending } = useTaskViewNavigation();
  const delayedIsPending = useDelayedBoolean(isPending, 200);
  useTaskViewShortcuts();

  const {
    hasUpstream,
    aheadCount,
    behindCount,
    fetch,
    pull,
    push,
    publish,
    isPublishing,
    isFetching,
    isPulling,
    isPushing,
  } = useGitActions(projectId, taskId);

  const projectStore = asMounted(getProjectStore(projectId));

  const projectName = projectDisplayName(getProjectStore(projectId));

  const isRemoteProject = projectStore?.data.type === 'ssh';
  return (
    <Titlebar
      leftSlot={
        <div className="flex items-center gap-1 px-2">
          <Popover>
            <PopoverTrigger className="flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground">
              <span className="flex items-center gap-1">
                <span className="text-sm text-foreground-passive">{projectName}</span>
                <span className="text-sm text-foreground-passive">/</span>
                {taskDisplayName(taskStore)}
              </span>
              <ChevronDown className="size-3.5 shrink-0" />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-0 gap-0 overflow-hidden">
              <div className="flex flex-col gap-2.5 px-3.5 pt-3 pb-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <GitBranch className="size-3.5 shrink-0 text-foreground-passive" />
                    <span className="truncate text-foreground">
                      {provisionedTask.workspace.git.branchName}
                    </span>
                  </span>
                  {taskPayload.sourceBranch && (
                    <span className="pl-[22px] truncate text-xs text-foreground-passive">
                      from{' '}
                      <span className="text-foreground-muted">
                        {taskPayload.sourceBranch.branch}
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {hasUpstream ? (
                    <>
                      <Tooltip>
                        <TooltipTrigger className="flex-1">
                          <Button
                            className="w-full"
                            variant="outline"
                            size="xs"
                            disabled={isFetching}
                            onClick={() => fetch()}
                          >
                            <RefreshCcw className="size-3" />
                            {isFetching ? 'Fetching…' : 'Fetch'}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isFetching ? 'Fetching…' : 'Fetch changes'}
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger className="flex-1">
                          <Button
                            className="w-full"
                            variant="outline"
                            disabled={isPulling || behindCount === 0}
                            size="xs"
                            onClick={() => pull()}
                          >
                            <ArrowDown className="size-3" />
                            {isPulling ? (
                              'Pulling…'
                            ) : (
                              <span className="flex items-center gap-1">
                                Pull
                                <Badge variant="secondary" className="shrink-0">
                                  {behindCount}
                                </Badge>
                              </span>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isPulling
                            ? 'Pulling…'
                            : behindCount === 0
                              ? 'Nothing to pull'
                              : 'Pull changes'}
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger className="flex-1">
                          <Button
                            className="w-full"
                            variant="outline"
                            disabled={isPushing || aheadCount === 0}
                            size="xs"
                            onClick={() => push()}
                          >
                            <ArrowUp className="size-3" />
                            {isPushing ? (
                              'Pushing…'
                            ) : (
                              <span className="flex items-center gap-1">
                                Push
                                <Badge variant="secondary" className="shrink-0">
                                  {aheadCount}
                                </Badge>
                              </span>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isPushing
                            ? 'Pushing…'
                            : aheadCount === 0
                              ? 'Nothing to push'
                              : 'Push changes'}
                        </TooltipContent>
                      </Tooltip>
                    </>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger className="flex-1">
                        <Button
                          className="w-full"
                          variant="outline"
                          disabled={isPublishing}
                          size="xs"
                          onClick={() => publish()}
                        >
                          <ArrowUp className="size-3" />
                          {isPublishing ? 'Publishing…' : 'Publish'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isPublishing ? 'Publishing…' : 'Publish branch'}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>

              {isRemoteProject && (
                <div className="border-t border-border px-3.5 py-3">
                  <OpenInMenu path={provisionedTask.path} />
                </div>
              )}

              <div className="flex flex-col gap-1.5 border-t border-border px-3.5 py-3">
                <MicroLabel className="text-foreground-passive">Linked issue</MicroLabel>
                <IssueSelector
                  value={taskPayload.linkedIssue ?? null}
                  onValueChange={(issue) => {
                    taskStore.updateLinkedIssue(issue ?? undefined);
                  }}
                  projectId={projectId}
                  nameWithOwner={provisionedTask.repositoryStore.repositoryUrl ?? ''}
                  projectPath={provisionedTask.path}
                />
              </div>
            </PopoverContent>
          </Popover>
          <button
            className={cn(
              'text-foreground-muted ml-1',
              taskPayload.isPinned && 'text-muted-foreground'
            )}
            onClick={() => taskStore.setPinned(!taskPayload.isPinned)}
          >
            <Pin
              className={cn('size-3.5', taskPayload.isPinned && 'text-foreground-muted')}
              fill={taskPayload.isPinned ? 'currentColor' : 'none'}
            />
          </button>
        </div>
      }
      rightSlot={
        <div className="flex items-center gap-2 mr-2">
          <DevServerPills projectId={projectId} taskId={taskId} />
          {!isRemoteProject && (
            <OpenInMenu path={provisionedTask.path} className="h-7  bg-background" />
          )}
          <ToggleGroup
            disabled={delayedIsPending}
            variant="outline"
            value={[view]}
            size="sm"
            onValueChange={([value]) => {
              if (value === 'agents') openAgentsView();
              if (value === 'editor') openEditorView();
              if (value === 'diff') openDiffView();
            }}
          >
            <Tooltip>
              <TooltipTrigger>
                <ToggleGroupItem value="agents" size="sm">
                  <MessageSquare className="size-3.5" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col gap-1">
                  <span>Conversations view</span>
                  <ShortcutHint settingsKey="taskViewAgents" />
                </div>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <ToggleGroupItem value="diff" size="sm">
                  <FileDiff className="size-3.5" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col gap-1">
                  <span>Diff view</span>
                  <ShortcutHint settingsKey="taskViewDiff" />
                </div>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <ToggleGroupItem value="editor" size="sm">
                  <Files className="size-3.5" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col gap-1">
                  <span>File view</span>
                  <ShortcutHint settingsKey="taskViewEditor" />
                </div>
              </TooltipContent>
            </Tooltip>
          </ToggleGroup>
        </div>
      }
    />
  );
});
