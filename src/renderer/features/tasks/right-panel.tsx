import { FileMagnifyingGlass, Files, GitCommit, Plus, Terminal } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import { Activity, useEffect, useRef } from 'react';
import { useProvisionedTask, useTaskViewContext } from '@renderer/features/tasks/task-view-context';
import type { RightPanelView } from '@renderer/features/tasks/types';
import { useWorkspaceLayoutContext } from '@renderer/lib/layout/layout-provider';
import { useShowModal } from '@renderer/lib/modal/modal-provider';
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/lib/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/lib/ui/tooltip';
import { cn } from '@renderer/utils/utils';
import { ChangesPanel } from './diff-view/changes-panel/changes-panel';
import { EditorFileTree } from './editor/editor-file-tree';
import { TerminalsPanel } from './terminals/terminal-panel';

interface RightTab {
  id: RightPanelView;
  label: string;
  icon: React.ReactNode;
}

const TABS: RightTab[] = [
  { id: 'changes', label: 'Changes', icon: <GitCommit className="size-3.5" /> },
  { id: 'files', label: 'Files', icon: <Files className="size-3.5" /> },
  { id: 'terminals', label: 'Terminals', icon: <Terminal className="size-3.5" /> },
];

export const TaskRightSidebar = observer(function TaskRightSidebar() {
  const { taskView } = useProvisionedTask();
  const { projectId, taskId } = useTaskViewContext();
  const showReviewModal = useShowModal('reviewModal');
  const { isRightOpen } = useWorkspaceLayoutContext();

  const prevIsRightOpenRef = useRef(isRightOpen);
  useEffect(() => {
    if (prevIsRightOpenRef.current && !isRightOpen) {
      taskView.setFocusedRegion('main');
    }
    prevIsRightOpenRef.current = isRightOpen;
  }, [isRightOpen, taskView]);

  const active = taskView.rightPanelView;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background-tertiary text-foreground-tertiary-muted">
      <div className="flex h-10 shrink-0 items-center justify-between pl-1 pr-1">
        <div className="flex items-center gap-0.5">
          {TABS.map((tab) => {
            const isActive = active === tab.id;
            return (
              <Tooltip key={tab.id}>
                <TooltipTrigger>
                  <button
                    onClick={() => taskView.setRightPanelView(tab.id)}
                    className={cn(
                      'flex h-7 items-center gap-1.5 rounded-md px-2 text-xs transition-colors',
                      isActive
                        ? 'bg-background-tertiary-2 text-foreground-tertiary'
                        : 'text-foreground-tertiary-muted hover:bg-background-tertiary-1 hover:text-foreground-tertiary'
                    )}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>{tab.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger>
              <button
                onClick={() =>
                  showReviewModal({
                    projectId,
                    taskId,
                    onSuccess: ({ conversationId }) =>
                      taskView.conversationTabs.setActiveTab(conversationId),
                  })
                }
                className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-foreground-tertiary-muted transition-colors hover:bg-background-tertiary-1 hover:text-foreground-tertiary"
              >
                <FileMagnifyingGlass className="size-3.5" />
                <span>Review</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Run an agent review on these changes</TooltipContent>
          </Tooltip>
          <Popover>
            <Tooltip>
              <TooltipTrigger>
                <PopoverTrigger className="flex size-7 items-center justify-center rounded-md text-foreground-tertiary-muted transition-colors hover:bg-background-tertiary-1 hover:text-foreground-tertiary">
                  <Plus className="size-3.5" />
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>New tab</TooltipContent>
            </Tooltip>
            <PopoverContent align="end" className="w-56 p-1">
              <div className="px-2 py-1.5 text-xs text-foreground-passive">
                More tab types coming soon
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <Activity mode={active === 'changes' ? 'visible' : 'hidden'}>
          <ChangesPanel />
        </Activity>
        <Activity mode={active === 'files' ? 'visible' : 'hidden'}>
          <EditorFileTree />
        </Activity>
        <Activity mode={active === 'terminals' ? 'visible' : 'hidden'}>
          <TerminalsPanel />
        </Activity>
      </div>
    </div>
  );
});
