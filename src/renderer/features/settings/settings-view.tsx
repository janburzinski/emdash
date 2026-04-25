import { type ReactNode } from 'react';
import {
  SettingsPage,
  type SettingsPageTab,
} from '@renderer/features/settings/components/SettingsPage';
import { Titlebar } from '@renderer/lib/components/titlebar/Titlebar';
import { useParams } from '@renderer/lib/layout/navigation-provider';

/** Minimal passthrough — exists so the registry can infer WrapParams<'settings'>. */
export function SettingsViewWrapper({ children }: { children: ReactNode; tab?: SettingsPageTab }) {
  return <>{children}</>;
}

export function SettingsTitlebar() {
  return (
    <Titlebar
      leftSlot={
        <div className="flex items-center px-2">
          <span className="text-sm text-foreground-muted">Settings</span>
        </div>
      }
    />
  );
}

export function SettingsMainPanel() {
  const { params } = useParams('settings');
  return (
    <div className="relative z-10 flex min-h-0 flex-1 overflow-hidden bg-background">
      <SettingsPage tab={params.tab ?? 'general'} />
    </div>
  );
}

export const settingsView = {
  WrapView: SettingsViewWrapper,
  TitlebarSlot: SettingsTitlebar,
  MainPanel: SettingsMainPanel,
};
