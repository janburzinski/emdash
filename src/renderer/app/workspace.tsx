import { motion } from 'framer-motion';
import { useLayoutEffect } from 'react';
import { FloatingSidebarToggle } from '@renderer/features/sidebar/floating-sidebar-toggle';
import { LeftSidebar } from '@renderer/features/sidebar/left-sidebar';
import { SettingsSidebar } from '@renderer/features/sidebar/settings-sidebar';
import { AppKeyboardShortcuts } from '@renderer/lib/components/app-keyboard-shortcuts';
import { useGlassSidebar } from '@renderer/lib/hooks/useGlassSidebar';
import { useNavigationGestures } from '@renderer/lib/hooks/useNavigationGestures';
import { useTheme } from '@renderer/lib/hooks/useTheme';
import {
  useViewLayoutOverride,
  useWorkspaceSlots,
  useWorkspaceWrapParams,
} from '@renderer/lib/layout/navigation-provider';
import { WorkspaceContentLayout, WorkspaceLayout } from '@renderer/lib/layout/workspace-layout';
import { ModalRenderer } from '@renderer/lib/modal/modal-renderer';
import { Toaster } from '@renderer/lib/ui/toaster';
import { cn } from '@renderer/utils/utils';

export function Workspace() {
  useTheme();
  useNavigationGestures();
  const { WrapView, currentView } = useWorkspaceSlots();
  const { wrapParams } = useWorkspaceWrapParams();
  const isSettings = currentView === 'settings';
  const glass = useGlassSidebar();

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('glass-sidebar-enabled', glass);
    return () => {
      document.documentElement.classList.remove('glass-sidebar-enabled');
    };
  }, [glass]);

  return (
    <>
      <AppKeyboardShortcuts />
      <div className="relative h-full w-full">
        <WorkspaceLayout
          leftSidebar={
            <div
              className={cn(
                'relative h-full w-full overflow-hidden',
                glass ? 'glass-sidebar-shell' : 'bg-background-tertiary'
              )}
            >
              <motion.div
                initial={false}
                animate={{
                  x: isSettings ? '-30%' : '0%',
                  filter: isSettings ? 'blur(8px)' : 'blur(0px)',
                  opacity: isSettings ? 0 : 1,
                }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  'absolute inset-0 will-change-transform',
                  isSettings && 'pointer-events-none'
                )}
                aria-hidden={isSettings}
              >
                <LeftSidebar />
              </motion.div>
              <motion.div
                initial={false}
                animate={{
                  x: isSettings ? '0%' : '30%',
                  filter: isSettings ? 'blur(0px)' : 'blur(8px)',
                  opacity: isSettings ? 1 : 0,
                }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  'absolute inset-0 will-change-transform',
                  !isSettings && 'pointer-events-none'
                )}
                aria-hidden={!isSettings}
              >
                <SettingsSidebar />
              </motion.div>
            </div>
          }
          mainContent={
            <WrapView {...wrapParams}>
              <ModalRenderer />
              <WorkspaceViewContent />
            </WrapView>
          }
        />
        <FloatingSidebarToggle />
      </div>
      <Toaster />
    </>
  );
}

function WorkspaceViewContent() {
  const { TitlebarSlot, MainPanel, RightPanel } = useWorkspaceSlots();
  const { hideRightPanel } = useViewLayoutOverride();
  const EffectiveRightPanel = hideRightPanel ? null : RightPanel;
  return (
    <WorkspaceContentLayout
      titlebarSlot={<TitlebarSlot />}
      mainPanel={<MainPanel />}
      rightPanel={EffectiveRightPanel ? <EffectiveRightPanel /> : null}
    />
  );
}
