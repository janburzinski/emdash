import { observer } from 'mobx-react-lite';
import {
  asMounted,
  getProjectManagerStore,
  projectDisplayName,
} from '@renderer/features/projects/stores/project-selectors';
import { getSortInstant } from '@renderer/features/sidebar/sidebar-store';
import type { TaskStore } from '@renderer/features/tasks/stores/task';
import { useNavigate } from '@renderer/lib/layout/navigation-provider';
import { RelativeTime } from '@renderer/lib/ui/relative-time';

const MAX_RECENT_TASKS = 3;

type RecentEntry = {
  projectId: string;
  task: TaskStore;
  sortKey: string;
};

export const HomeRecentTasks = observer(function HomeRecentTasks() {
  const { navigate } = useNavigate();
  const projects = getProjectManagerStore().projects;

  const entries: RecentEntry[] = [];
  for (const [projectId, store] of projects) {
    const mounted = asMounted(store);
    if (!mounted) continue;
    for (const task of mounted.taskManager.tasks.values()) {
      entries.push({ projectId, task, sortKey: getSortInstant(task, 'updated') });
    }
  }

  const recent = entries
    .sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0))
    .slice(0, MAX_RECENT_TASKS);

  if (recent.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-[640px]">
      <div className="mb-2 px-1 text-xs font-medium text-foreground-muted">Recent</div>
      <ul className="flex flex-col gap-1">
        {recent.map(({ projectId, task, sortKey }) => {
          const projectName = projectDisplayName(projects.get(projectId)) ?? '';
          const taskName = task.data.name ?? 'Untitled task';
          return (
            <li key={`${projectId}:${task.data.id}`}>
              <button
                type="button"
                onClick={() => navigate('task', { projectId, taskId: task.data.id })}
                className="group flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:bg-background-1"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate text-sm">{taskName}</span>
                  {projectName && (
                    <span className="truncate text-xs text-foreground-muted">{projectName}</span>
                  )}
                </div>
                {sortKey && (
                  <RelativeTime
                    value={sortKey}
                    compact
                    className="shrink-0 text-xs text-foreground-muted"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
});
