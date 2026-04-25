import React from 'react';
import { rpc } from '@renderer/lib/ipc';
import { Switch } from '@renderer/lib/ui/switch';
import { useAppSettingsKey } from '../use-app-settings-key';
import { SettingRow } from './SettingRow';

export const GlassSidebarRow: React.FC = () => {
  const { value: iface, update, isLoading, isSaving } = useAppSettingsKey('interface');
  const enabled = iface?.glassSidebar ?? false;

  const handleChange = (next: boolean) => {
    update({ glassSidebar: next });
    void rpc.app.setGlassSidebar(next);
  };

  return (
    <SettingRow
      title="Glass Sidebar"
      description="Make the sidebar translucent so you can see your desktop behind the app."
      control={
        <Switch checked={enabled} disabled={isLoading || isSaving} onCheckedChange={handleChange} />
      }
    />
  );
};
