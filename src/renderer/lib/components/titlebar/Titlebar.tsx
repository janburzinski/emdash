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
        'flex h-10 shrink-0 items-center border-b border-border bg-background-secondary pr-2 transition-[padding-left] duration-200 ease-out [-webkit-app-region:drag] dark:bg-background',
        !isLeftOpen && 'pl-40'
      )}
    >
      <div className="pointer-events-auto flex min-w-0 w-full items-center gap-1">
        <div className="flex min-w-0 w-full items-center justify-between gap-2">
          <div className="flex min-w-0 items-center justify-start [-webkit-app-region:no-drag]">
            {leftSlot}
          </div>
          <div className="flex shrink-0 items-center justify-end [-webkit-app-region:no-drag]">
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
