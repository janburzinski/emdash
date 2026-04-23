import { Clock, History, Loader2, Pause, Play, Trash2, Zap } from 'lucide-react';
import React from 'react';
import type { Automation } from '@shared/automations/types';
import { Button } from '@renderer/lib/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/lib/ui/tooltip';
import { cn } from '@renderer/utils/utils';
import { TriggerTypeIcon } from './trigger-controls';
import { useIsAutomationRunning } from './useAutomations';
import { describeSchedule, describeTrigger, formatRelative, formatRelativeFuture } from './utils';

type Props = {
  automation: Automation;
  onToggle: () => void;
  onDelete: () => void;
  onTriggerNow: () => void;
  onShowLogs: () => void;
  onEdit: () => void;
  busy?: boolean;
};

function StatusLabel({ automation, isRunning }: { automation: Automation; isRunning: boolean }) {
  if (isRunning) {
    return (
      <span className="inline-flex items-center gap-1 text-blue-500/90">
        <Loader2 className="h-3 w-3 animate-spin" />
        Running
      </span>
    );
  }
  if (automation.status === 'paused') {
    return <span className="text-muted-foreground/60">Paused</span>;
  }
  if (automation.status === 'error' || automation.lastRunResult === 'failure') {
    return <span className="text-destructive/80">Last run failed</span>;
  }
  return <span className="text-emerald-500/80">Active</span>;
}

export const AutomationRow: React.FC<Props> = ({
  automation,
  onToggle,
  onDelete,
  onTriggerNow,
  onShowLogs,
  onEdit,
  busy = false,
}) => {
  const isPaused = automation.status === 'paused';
  const isRunning = useIsAutomationRunning(automation.id);
  const cadence =
    automation.mode === 'schedule'
      ? describeSchedule(automation.schedule)
      : describeTrigger(automation.triggerType);

  const stop = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.currentTarget !== e.target) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit();
        }
      }}
      className={cn(
        'group cursor-pointer rounded-xl border border-border bg-muted/20 px-3 py-2.5 shadow-sm transition-[background-color,border-color,opacity,box-shadow,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted/40 active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        isPaused && !busy && !isRunning && 'opacity-60',
        isRunning && 'border-blue-500/30 bg-blue-500/[0.04]'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
          {automation.mode === 'trigger' && automation.triggerType ? (
            <TriggerTypeIcon triggerType={automation.triggerType} className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-medium truncate">{automation.name}</h3>
            <span className="shrink-0 text-xs">
              <StatusLabel automation={automation} isRunning={isRunning} />
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground/80 min-w-0">
            <span className="truncate">{automation.projectName || automation.projectId}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="shrink-0">{automation.agentId}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="shrink-0 truncate">{cadence}</span>
            <span className="text-muted-foreground/40">·</span>
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                onShowLogs();
              }}
              className="shrink-0 tabular-nums transition-colors duration-150 hover:text-foreground"
            >
              {automation.runCount} {automation.runCount === 1 ? 'run' : 'runs'}
            </button>
            <span className="text-muted-foreground/40">·</span>
            <span className="shrink-0 tabular-nums">
              {automation.mode === 'schedule' && !isPaused
                ? `next ${formatRelativeFuture(automation.nextRunAt)}`
                : `last ${formatRelative(automation.lastRunAt)}`}
            </span>
          </div>
          {automation.lastRunError && (
            <p className="mt-1 text-xs text-destructive/80 truncate">{automation.lastRunError}</p>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
          {automation.mode === 'schedule' && (
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    stop(e);
                    onTriggerNow();
                  }}
                  disabled={busy}
                  aria-label="Run now"
                >
                  <Zap className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Run now</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  stop(e);
                  onToggle();
                }}
                disabled={busy}
                aria-label={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isPaused ? 'Resume' : 'Pause'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  stop(e);
                  onShowLogs();
                }}
                aria-label="View run logs"
              >
                <History className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Run logs</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  stop(e);
                  onDelete();
                }}
                disabled={busy}
                aria-label="Delete"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
