import { useAppSettingsKey } from '@renderer/features/settings/use-app-settings-key';

export function useGlassSidebar(): boolean {
  const { value } = useAppSettingsKey('interface');
  return value?.glassSidebar ?? false;
}
