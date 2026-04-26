import React from 'react';
import { useAppSettingsKey } from '@renderer/features/settings/use-app-settings-key';
import { Switch } from '@renderer/lib/ui/switch';
import { ResetToDefaultButton } from './ResetToDefaultButton';
import { SettingRow } from './SettingRow';

const AntialiasingCard: React.FC = () => {
  const {
    value: iface,
    update,
    isLoading,
    isSaving,
    isFieldOverridden,
    resetField,
  } = useAppSettingsKey('interface');

  const antialiasing = iface?.antialiasing ?? true;

  const handleToggle = (next: boolean) => {
    update({ antialiasing: next });
  };

  return (
    <SettingRow
      title="Antialiasing"
      description="Smooths font rendering across the app for crisper text."
      control={
        <>
          <ResetToDefaultButton
            visible={isFieldOverridden('antialiasing')}
            defaultLabel="on"
            onReset={() => resetField('antialiasing')}
            disabled={isLoading || isSaving}
          />
          <Switch
            checked={antialiasing}
            disabled={isLoading || isSaving}
            onCheckedChange={handleToggle}
          />
        </>
      }
    />
  );
};

export default AntialiasingCard;
