import { SidebarSimple as PanelLeft } from '@phosphor-icons/react';
import { useWorkspaceLayoutContext } from '@renderer/lib/layout/layout-provider';
import { ShortcutHint } from '@renderer/lib/ui/shortcut-hint';
import { Toggle } from '@renderer/lib/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/lib/ui/tooltip';

export function FloatingSidebarToggle() {
  const { isLeftOpen, setCollapsed } = useWorkspaceLayoutContext();
  return (
    <div className="pointer-events-none absolute top-0 left-0 z-30 flex pt-1 pl-16">
      <Tooltip>
        <TooltipTrigger>
          <Toggle
            className="pointer-events-auto [-webkit-app-region:no-drag] ml-1 size-7 data-pressed:bg-transparent"
            size="sm"
            pressed={isLeftOpen}
            onPressedChange={() => setCollapsed('left', isLeftOpen)}
          >
            <PanelLeft />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>
          Toggle left sidebar
          <ShortcutHint settingsKey="toggleLeftSidebar" />
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
