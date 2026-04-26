import {
  CaretDown as ChevronDown,
  GitCommit,
  Plus,
  ArrowsClockwise as RefreshCw,
} from '@phosphor-icons/react';
import { SelectionState } from '@renderer/features/tasks/diff-view/stores/changes-view-store';
import { Badge } from '@renderer/lib/ui/badge';
import { Button } from '@renderer/lib/ui/button';
import { Checkbox } from '@renderer/lib/ui/checkbox';
import { SplitButton, type SplitButtonAction } from '@renderer/lib/ui/split-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/lib/ui/tooltip';
import { cn } from '@renderer/utils/utils';

interface SectionHeaderProps {
  label: string;
  count: number;
  selectionState: SelectionState;
  onToggleAll: () => void;
  actions?: React.ReactNode;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export function SectionHeader({
  label,
  count,
  selectionState,
  onToggleAll,
  actions,
  collapsed,
  onToggleCollapsed,
}: SectionHeaderProps) {
  return (
    <div className="shrink-0 flex items-center justify-between px-2.5 h-10">
      <div className="flex items-center gap-2 justify-between w-full">
        <button onClick={onToggleCollapsed}>
          <span className="text-sm text-foreground-muted flex items-center gap-2">
            <span>{label}</span> <Badge variant="secondary">{count}</Badge>{' '}
            <span className="p-2 text-foreground-muted hover:text-foreground">
              <ChevronDown
                className={cn(
                  'size-4 transition-transform duration-200 ease-in-out',
                  collapsed ? '-rotate-90' : 'rotate-0'
                )}
              />
            </span>
          </span>
        </button>
        <Checkbox
          checked={selectionState === 'all'}
          indeterminate={selectionState === 'partial'}
          onCheckedChange={onToggleAll}
          aria-label={`Select all ${label.toLowerCase()}`}
          className="mr-0.5"
        />
      </div>
      {actions}
    </div>
  );
}

export function PullRequestSectionHeader({
  count,
  collapsed,
  onToggleCollapsed,
  hasOpenPr,
  onCreatePr,
  onCreateDraftPr,
  onCreatePrManually,
  onCommit,
  onRefresh,
  isRefreshing,
}: {
  count: number;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  hasOpenPr: boolean;
  onCreatePr?: () => void;
  onCreateDraftPr?: () => void;
  onCreatePrManually?: () => void;
  onCommit?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  const prActions: SplitButtonAction[] = [
    {
      value: 'create-pr',
      label: 'Create PR',
      action: () => onCreatePr?.(),
    },
    {
      value: 'create-draft-pr',
      label: 'Create draft PR',
      action: () => onCreateDraftPr?.(),
    },
    {
      value: 'create-pr-manually',
      label: 'Create PR manually',
      description: 'Open the GitHub compare page in your browser',
      action: () => onCreatePrManually?.(),
    },
  ];

  return (
    <div className="shrink-0 flex items-center justify-between px-2.5 h-10">
      <div className="flex items-center gap-2 justify-between w-full min-w-0">
        <button onClick={onToggleCollapsed} className="min-w-0">
          <span className="text-sm text-foreground-muted flex items-center gap-2 min-w-0">
            <span className="truncate">Pull Requests</span>{' '}
            <Badge variant="secondary" className="shrink-0">
              {count}
            </Badge>
            <span className="p-2 text-foreground-muted hover:text-foreground">
              <ChevronDown
                className={cn(
                  'size-4 transition-transform duration-200 ease-in-out',
                  collapsed ? '-rotate-90' : 'rotate-0'
                )}
              />
            </span>
          </span>
        </button>
        <div className="flex items-center gap-1.5">
          {onCommit && (
            <Tooltip>
              <TooltipTrigger>
                <Button variant="outline" size="icon-xs" onClick={onCommit}>
                  <GitCommit className="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Commit (AI-generated message via Codex)</TooltipContent>
            </Tooltip>
          )}
          <SplitButton
            variant="outline"
            size="xs"
            actions={prActions}
            disabled={hasOpenPr}
            icon={<Plus className="size-3" />}
          />
          <Tooltip>
            <TooltipTrigger>
              <Button variant="outline" size="icon-xs" onClick={onRefresh} disabled={isRefreshing}>
                <RefreshCw className={cn('size-3', isRefreshing && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh pull requests</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
