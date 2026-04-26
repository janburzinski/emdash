import { ArrowLeft, ArrowSquareOut } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import type { SettingsPageTab } from '@renderer/features/settings/components/SettingsPage';
import { useGlassSidebar } from '@renderer/lib/hooks/useGlassSidebar';
import { rpc } from '@renderer/lib/ipc';
import { useNavigate, useParams } from '@renderer/lib/layout/navigation-provider';
import { MicroLabel } from '@renderer/lib/ui/label';
import { cn } from '@renderer/utils/utils';
import { SidebarContainer, SidebarMenu, SidebarMenuButton } from './sidebar-primitives';
import { SidebarSpace } from './sidebar-space';

const TABS: ReadonlyArray<{
  id: SettingsPageTab;
  label: string;
  isExternal?: boolean;
}> = [
  { id: 'general', label: 'General' },
  { id: 'account', label: 'Account' },
  { id: 'clis-models', label: 'Agents' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'repository', label: 'Repository' },
  { id: 'interface', label: 'Interface' },
  { id: 'docs', label: 'Docs', isExternal: true },
];

export const SettingsSidebar = observer(function SettingsSidebar() {
  const { navigate } = useNavigate();
  const { params, setParams } = useParams('settings');
  const activeTab = params.tab ?? 'general';
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
            onClick={() => navigate('home')}
            aria-label="Back"
            className="w-full justify-start"
          >
            <ArrowLeft className="h-5 w-5 sm:h-4 sm:w-4" />
            Back
          </SidebarMenuButton>
        </SidebarMenu>
        <div className="px-5 pt-5 pb-2">
          <MicroLabel className="uppercase tracking-wider text-foreground-tertiary-muted">
            Settings
          </MicroLabel>
        </div>
        <SidebarMenu className="px-3 pb-3 flex flex-col gap-0.5">
          {TABS.map((tab) => {
            const isActive = !tab.isExternal && tab.id === activeTab;
            const handleClick = () => {
              if (tab.isExternal) {
                rpc.app.openExternal('https://docs.emdash.sh');
              } else {
                setParams({ tab: tab.id });
              }
            };
            return (
              <SidebarMenuButton
                key={tab.id}
                isActive={isActive}
                onClick={handleClick}
                aria-label={tab.label}
                className="w-full justify-between"
              >
                <span className="text-left">{tab.label}</span>
                {tab.isExternal && <ArrowSquareOut className="h-4 w-4" />}
              </SidebarMenuButton>
            );
          })}
        </SidebarMenu>
      </SidebarContainer>
    </div>
  );
});
