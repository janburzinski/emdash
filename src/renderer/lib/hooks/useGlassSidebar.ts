import { useContext } from 'react';
import { useAppSettingsKey } from '@renderer/features/settings/use-app-settings-key';
import { ThemeContext } from '@renderer/lib/providers/theme-provider';

export function useGlassSidebar(): boolean {
  const { value } = useAppSettingsKey('interface');
  const themeContext = useContext(ThemeContext);
  if (themeContext?.effectiveTheme === 'emdark') return false;
  return value?.glassSidebar ?? false;
}
