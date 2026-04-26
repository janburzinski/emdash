import { SidebarSimple as PanelRight } from '@phosphor-icons/react';
import { ReactNode } from 'react';
import { useWorkspaceLayoutContext } from '@renderer/lib/layout/layout-provider';
import { useWorkspaceSlots } from '@renderer/lib/layout/navigation-provider';
import { ShortcutHint } from '@renderer/lib/ui/shortcut-hint';
import { Toggle } from '@renderer/lib/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/lib/ui/tooltip';
import { cn } from '@renderer/utils/utils';

export function Titlebar({ leftSlot, rightSlot }: { leftSlot?: ReactNode; rightSlot?: ReactNode }) {
  const { isRightOpen, setCollapsed, isLeftOpen } = useWorkspaceLayoutContext();
  const { RightPanel } = useWorkspaceSlots();
  return (
    <header
      className={cn(
        'flex h-10 shrink-0 items-center border-b border-border bg-background-secondary pr-2 [-webkit-app-region:drag] dark:bg-background',
        !isLeftOpen && 'pl-28'
      )}
    >
      <div className="pointer-events-auto flex w-full items-center gap-1">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center justify-start [-webkit-app-region:no-drag]">
            {leftSlot}
          </div>
          <div className="flex items-center justify-end [-webkit-app-region:no-drag]">
            {rightSlot}
            <Tooltip>
              <TooltipTrigger>
                <Toggle
                  className="[-webkit-app-region:no-drag] data-pressed:bg-transparent"
                  disabled={!RightPanel}
                  pressed={isRightOpen}
                  size="sm"
                  onPressedChange={() => setCollapsed('right', isRightOpen)}
                >
                  <PanelRight />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>
                Toggle right sidebar
                <ShortcutHint settingsKey="toggleRightSidebar" />
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </header>
  );
}
