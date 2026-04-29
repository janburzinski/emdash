import { observer } from 'mobx-react-lite';
import type { TaskStore } from '@renderer/features/tasks/stores/task';
import { asProvisioned } from '@renderer/features/tasks/stores/task-selectors';
import { cn } from '@renderer/utils/utils';

function formatLineCount(n: number): string {
  if (n < 1000) return String(n);
  const tenths = Math.floor(n / 100) / 10;
  if (tenths >= 100) return `${Math.floor(tenths)}k`;
  return `${tenths}k`;
}

/**
 * Working-tree line add/remove totals for a provisioned task (same source as GitStore / diff UI).
 * Renders nothing when unprovisioned, loading, in error, or clean.
 */
export const TaskGitDiffStats = observer(function TaskGitDiffStats({
  task,
  className,
}: {
  task: TaskStore;
  className?: string;
}) {
  const git = asProvisioned(task)?.workspace.git;
  const linesAdded = git?.totalLinesAdded ?? 0;
  const linesDeleted = git?.totalLinesDeleted ?? 0;
  const visible = git !== undefined && !git.error && (linesAdded > 0 || linesDeleted > 0);

  if (!visible) return null;

  return (
    <span
      className={cn(
        'shrink-0 tabular-nums leading-none text-muted-foreground flex items-center gap-1 text-xs',
        className
      )}
      aria-label={`${linesAdded} lines added, ${linesDeleted} lines removed`}
    >
      {linesAdded > 0 ? (
        <span className="text-foreground-diff-added">+{formatLineCount(linesAdded)}</span>
      ) : null}
      {linesAdded > 0 && linesDeleted > 0 ? ' ' : null}
      {linesDeleted > 0 ? (
        <span className="text-foreground-diff-deleted">-{formatLineCount(linesDeleted)}</span>
      ) : null}
    </span>
  );
});
