import {
  ChatCircleDots,
  CaretDown as ChevronDown,
  FolderPlus,
  Gauge,
  SignOut as LogOut,
  Plug,
  PuzzlePiece as Puzzle,
  Gear as Settings,
} from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useGlassSidebar } from '@renderer/lib/hooks/useGlassSidebar';
import {
  isCurrentView,
  useNavigate,
  useWorkspaceSlots,
} from '@renderer/lib/layout/navigation-provider';
import { useShowModal } from '@renderer/lib/modal/modal-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@renderer/lib/ui/dropdown-menu';
import { ShortcutHint } from '@renderer/lib/ui/shortcut-hint';
import { cn } from '@renderer/utils/utils';
import { SidebarPinnedTaskList } from './pinned-task-list';
import { ProjectsGroupLabel } from './projects-group-label';
import {
  SidebarContainer,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
} from './sidebar-primitives';
import { SidebarSpace } from './sidebar-space';
import { SidebarVirtualList } from './sidebar-virtual-list';

export const LeftSidebar: React.FC = observer(function LeftSidebar() {
  const { navigate } = useNavigate();
  const { currentView } = useWorkspaceSlots();

  const showAddProjectModal = useShowModal('addProjectModal');
  const showFeedbackModal = useShowModal('feedbackModal');

  const [usageOpen, setUsageOpen] = useState(false);
  const glass = useGlassSidebar();

  return (
    <div
      className={cn(
        'flex h-full flex-col text-foreground-tertiary-muted',
        glass ? 'bg-transparent' : 'bg-background-tertiary'
      )}
    >
      <SidebarSpace />
      <SidebarContainer className="w-full border-r-0 flex-1 min-h-0">
        <SidebarMenu className="px-3 pt-2 pb-1 flex flex-col gap-0.5 shrink-0">
          <SidebarMenuButton
            isActive={isCurrentView(currentView, 'home')}
            onClick={() => navigate('home')}
            aria-label="New Chat"
            className="w-full justify-start"
          >
            <ChatCircleDots className="h-5 w-5 sm:h-4 sm:w-4" />
            New Chat
          </SidebarMenuButton>
          <SidebarMenuButton
            isActive={false}
            onClick={() => showAddProjectModal({})}
            aria-label="Add Project"
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2 min-w-0 w-full">
              <FolderPlus className="h-5 w-5 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate min-w-0">Add Project</span>
            </span>
            <ShortcutHint settingsKey="newProject" />
          </SidebarMenuButton>
          <SidebarMenuButton
            isActive={isCurrentView(currentView, 'skills')}
            onClick={() => navigate('skills')}
            aria-label="Skills"
            className="w-full justify-start"
          >
            <Puzzle className="h-5 w-5 sm:h-4 sm:w-4" />
            Skills
          </SidebarMenuButton>
          <SidebarMenuButton
            isActive={isCurrentView(currentView, 'mcp')}
            onClick={() => navigate('mcp')}
            aria-label="MCP"
            className="w-full justify-start"
          >
            <Plug className="h-5 w-5 sm:h-4 sm:w-4" />
            MCP
          </SidebarMenuButton>
        </SidebarMenu>
        <SidebarContent className="flex flex-col">
          <SidebarPinnedTaskList />
          <SidebarGroup className="mb-0 min-h-0 flex-1 flex flex-col">
            <ProjectsGroupLabel />
            <SidebarGroupContent className="min-h-0 flex-1 flex flex-col">
              <SidebarMenu className="flex-1 min-h-0 flex flex-col">
                <SidebarVirtualList />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <div className="mt-auto px-3 py-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  isActive={isCurrentView(currentView, 'settings')}
                  aria-label="Settings"
                  className="w-full justify-start"
                >
                  <Settings className="h-5 w-5 sm:h-4 sm:w-4" />
                  Settings
                </SidebarMenuButton>
              }
            />
            <DropdownMenuContent align="start" side="top" sideOffset={6} className="min-w-60">
              <DropdownMenuItem onClick={() => navigate('settings')}>
                <Settings className="size-4" />
                <span className="flex-1">Settings</span>
                <ShortcutHint settingsKey="settings" />
              </DropdownMenuItem>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setUsageOpen((v) => !v);
                }}
                className="relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground outline-hidden select-none hover:bg-background-quaternary-1"
              >
                <Gauge className="size-4" />
                <span className="flex-1 text-left">Rate limits remaining</span>
                <ChevronDown
                  className={`size-3.5 text-foreground-muted transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    usageOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <AnimatePresence initial={false}>
                {usageOpen && (
                  <motion.div
                    key="usage-panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="flex flex-col gap-2 px-2 pb-1.5 pt-2 text-xs text-foreground-muted">
                      <div className="flex items-center justify-between">
                        <span>Weekly</span>
                        <span className="text-foreground">42 / 100</span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-background-quaternary-1">
                        <div className="h-full w-[42%] rounded-full bg-foreground-muted" />
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span>Monthly</span>
                        <span className="text-foreground">158 / 500</span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-background-quaternary-1">
                        <div className="h-full w-[31%] rounded-full bg-foreground-muted" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <DropdownMenuItem onClick={() => showFeedbackModal({})}>
                <ChatCircleDots className="size-4" />
                <span>Feedback</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('settings')}>
                <LogOut className="size-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarContainer>
    </div>
  );
});
