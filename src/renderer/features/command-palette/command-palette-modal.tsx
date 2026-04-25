import {
  ChatCircle,
  FolderPlus,
  Gear,
  GitBranch,
  MagnifyingGlass,
  PencilSimple,
} from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import { useMemo } from 'react';
import {
  asMounted,
  getProjectManagerStore,
  projectDisplayName,
} from '@renderer/features/projects/stores/project-selectors';
import { getSortInstant } from '@renderer/features/sidebar/sidebar-store';
import type { TaskStore } from '@renderer/features/tasks/stores/task';
import {
  useNavigate,
  useParams,
  useWorkspaceSlots,
} from '@renderer/lib/layout/navigation-provider';
import { BaseModalProps, useShowModal } from '@renderer/lib/modal/modal-provider';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@renderer/lib/ui/command';
import { Kbd, KbdGroup } from '@renderer/lib/ui/kbd';
import { RelativeTime } from '@renderer/lib/ui/relative-time';
import { ShortcutHint } from '@renderer/lib/ui/shortcut-hint';

const MAX_RECENT_TASKS = 8;

type RecentEntry = {
  projectId: string;
  projectName: string;
  task: TaskStore;
  sortKey: string;
};

export const CommandPaletteModal = observer(function CommandPaletteModal({
  onSuccess,
}: BaseModalProps<void>) {
  const { navigate } = useNavigate();
  const showCreateTask = useShowModal('taskModal');
  const showAddProject = useShowModal('addProjectModal');

  const { currentView } = useWorkspaceSlots();
  const { params: taskParams } = useParams('task');
  const { params: projectParams } = useParams('project');
  const currentProjectId =
    currentView === 'task'
      ? taskParams.projectId
      : currentView === 'project'
        ? projectParams.projectId
        : undefined;
  const currentTaskId = currentView === 'task' ? taskParams.taskId : undefined;

  const projects = getProjectManagerStore().projects;
  const currentProjectName = currentProjectId
    ? (projectDisplayName(projects.get(currentProjectId)) ?? 'this project')
    : null;

  const recent = useMemo<RecentEntry[]>(() => {
    const entries: RecentEntry[] = [];
    for (const [projectId, store] of projects) {
      const mounted = asMounted(store);
      if (!mounted) continue;
      const projectName = projectDisplayName(store) ?? '';
      for (const task of mounted.taskManager.tasks.values()) {
        if (task.state === 'unregistered') continue;
        if ('archivedAt' in task.data && task.data.archivedAt) continue;
        entries.push({
          projectId,
          projectName,
          task,
          sortKey: getSortInstant(task, 'updated'),
        });
      }
    }
    return entries
      .sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0))
      .slice(0, MAX_RECENT_TASKS);
  }, [projects]);

  const close = () => onSuccess();

  const run = (fn: () => void) => () => {
    close();
    fn();
  };

  return (
    <Command label="Command palette" loop>
      <div className="flex items-center gap-2.5 px-3 border-b border-border">
        <MagnifyingGlass className="size-3.5 shrink-0 text-foreground-passive" />
        <CommandInput autoFocus placeholder="Search commands, projects, and threads..." />
      </div>
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Actions">
          {currentProjectId && currentProjectName && (
            <CommandItem
              value={`new-thread-current ${currentProjectName}`}
              keywords={['new', 'thread', 'task', 'create', currentProjectName]}
              onSelect={run(() => showCreateTask({ projectId: currentProjectId }))}
            >
              <PencilSimple />
              <span>
                New thread in{' '}
                <span className="font-medium text-foreground">{currentProjectName}</span>
              </span>
              <CommandShortcut>
                <ShortcutHint settingsKey="newTask" />
              </CommandShortcut>
            </CommandItem>
          )}

          <CommandItem
            value="new-thread"
            keywords={['new', 'thread', 'task', 'create', 'pick']}
            onSelect={run(() => showCreateTask({}))}
          >
            <PencilSimple />
            <span>New thread in...</span>
          </CommandItem>

          <CommandItem
            value="add-project"
            keywords={['add', 'project', 'new', 'create', 'import', 'clone']}
            onSelect={run(() => showAddProject({ strategy: 'local', mode: 'pick' }))}
          >
            <FolderPlus />
            <span>Add project</span>
            <CommandShortcut>
              <ShortcutHint settingsKey="newProject" />
            </CommandShortcut>
          </CommandItem>

          <CommandItem
            value="open-settings"
            keywords={['settings', 'preferences', 'config']}
            onSelect={run(() => navigate('settings'))}
          >
            <Gear />
            <span>Open settings</span>
            <CommandShortcut>
              <ShortcutHint settingsKey="settings" />
            </CommandShortcut>
          </CommandItem>
        </CommandGroup>

        {recent.length > 0 && (
          <CommandGroup heading="Recent threads">
            {recent.map(({ projectId, projectName, task, sortKey }) => {
              const taskId = task.data.id;
              const taskName = task.data.name ?? 'Untitled task';
              const branch = 'taskBranch' in task.data ? task.data.taskBranch : undefined;
              const isCurrent = currentTaskId === taskId && currentProjectId === projectId;
              return (
                <CommandItem
                  key={`${projectId}:${taskId}`}
                  value={`thread-${projectId}-${taskId}`}
                  keywords={[taskName, projectName, branch ?? '']}
                  onSelect={run(() => navigate('task', { projectId, taskId }))}
                >
                  <ChatCircle />
                  <div className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="truncate text-sm text-foreground">{taskName}</span>
                    <span className="flex items-center gap-1 truncate text-xs text-foreground-passive">
                      {branch && (
                        <>
                          <GitBranch className="size-3" />
                          <span className="truncate">{branch}</span>
                          <span aria-hidden>·</span>
                        </>
                      )}
                      <span className="truncate">{projectName}</span>
                      {isCurrent && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="truncate">Current thread</span>
                        </>
                      )}
                    </span>
                  </div>
                  {sortKey && (
                    <RelativeTime
                      value={sortKey}
                      compact
                      className="shrink-0 text-xs text-foreground-passive"
                    />
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </CommandList>

      <div className="flex items-center gap-4 border-t border-border bg-background-1 px-3 py-2 text-xs text-foreground-muted">
        <KbdGroup>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          <span className="ml-1">Navigate</span>
        </KbdGroup>
        <KbdGroup>
          <Kbd>Enter</Kbd>
          <span className="ml-1">Select</span>
        </KbdGroup>
        <KbdGroup>
          <Kbd>Esc</Kbd>
          <span className="ml-1">Close</span>
        </KbdGroup>
      </div>
    </Command>
  );
});
