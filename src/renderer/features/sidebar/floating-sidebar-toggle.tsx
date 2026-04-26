import { CaretLeft, CaretRight, SidebarSimple as PanelLeft } from '@phosphor-icons/react';
import { useWorkspaceLayoutContext } from '@renderer/lib/layout/layout-provider';
import { useNavigationHistory } from '@renderer/lib/layout/navigation-provider';
import { Button } from '@renderer/lib/ui/button';
import { ShortcutHint } from '@renderer/lib/ui/shortcut-hint';
import { Toggle } from '@renderer/lib/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/lib/ui/tooltip';

export function FloatingSidebarToggle() {
  const { isLeftOpen, setCollapsed } = useWorkspaceLayoutContext();
  const { goBack, goForward, canGoBack, canGoForward } = useNavigationHistory();
  return (
    <div className="pointer-events-none absolute top-0 left-0 z-30 flex items-center pt-1 pl-16">
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
      <Tooltip>
        <TooltipTrigger>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!canGoBack}
            onClick={goBack}
            aria-label="Go back"
            className="pointer-events-auto [-webkit-app-region:no-drag] ml-1 size-7 text-foreground-muted hover:bg-background-1 hover:text-foreground disabled:opacity-40"
          >
            <CaretLeft className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Back</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!canGoForward}
            onClick={goForward}
            aria-label="Go forward"
            className="pointer-events-auto [-webkit-app-region:no-drag] size-7 text-foreground-muted hover:bg-background-1 hover:text-foreground disabled:opacity-40"
          >
            <CaretRight className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Forward</TooltipContent>
      </Tooltip>
    </div>
  );
}
