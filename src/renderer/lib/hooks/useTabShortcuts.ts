import { useHotkey } from '@tanstack/react-hotkeys';
import { useAppSettingsKey } from '@renderer/features/settings/use-app-settings-key';
import { getEffectiveHotkey, getHotkeyRegistration } from './useKeyboardShortcuts';

export interface TabNavigationProvider {
  setNextTabActive: () => void;
  setPreviousTabActive: () => void;
  setTabActiveIndex: (index: number) => void;
  closeActiveTab: () => void;
}

export interface UseTabShortcutsOptions {
  focused?: boolean;
}

export function useTabShortcuts(
  store: TabNavigationProvider | undefined,
  options?: UseTabShortcutsOptions
): void {
  const { value: keyboard } = useAppSettingsKey('keyboard');
  const enabled = !!store && (options?.focused ?? true);
  const tabNextHotkey = getEffectiveHotkey('tabNext', keyboard);
  const tabPrevHotkey = getEffectiveHotkey('tabPrev', keyboard);
  const tabCloseHotkey = getEffectiveHotkey('tabClose', keyboard);

  useHotkey(
    getHotkeyRegistration('tabNext', keyboard),
    () => {
      store?.setNextTabActive();
    },
    { enabled: enabled && tabNextHotkey !== null, conflictBehavior: 'allow' }
  );
  useHotkey(
    getHotkeyRegistration('tabPrev', keyboard),
    () => {
      store?.setPreviousTabActive();
    },
    { enabled: enabled && tabPrevHotkey !== null, conflictBehavior: 'allow' }
  );
  useHotkey(
    getHotkeyRegistration('tabClose', keyboard),
    (e) => {
      e.preventDefault();
      store?.closeActiveTab();
    },
    { enabled: enabled && tabCloseHotkey !== null, conflictBehavior: 'allow' }
  );
  useHotkey(
    'Mod+1',
    (e) => {
      e.preventDefault();
      store?.setTabActiveIndex(0);
    },
    { enabled, conflictBehavior: 'allow' }
  );
  useHotkey(
    'Mod+2',
    (e) => {
      e.preventDefault();
      store?.setTabActiveIndex(1);
    },
    { enabled, conflictBehavior: 'allow' }
  );
  useHotkey(
    'Mod+3',
    (e) => {
      e.preventDefault();
      store?.setTabActiveIndex(2);
    },
    { enabled, conflictBehavior: 'allow' }
  );
  useHotkey(
    'Mod+4',
    (e) => {
      e.preventDefault();
      store?.setTabActiveIndex(3);
    },
    { enabled, conflictBehavior: 'allow' }
  );
  useHotkey(
    'Mod+5',
    (e) => {
      e.preventDefault();
      store?.setTabActiveIndex(4);
    },
    { enabled, conflictBehavior: 'allow' }
  );
  useHotkey(
    'Mod+6',
    (e) => {
      e.preventDefault();
      store?.setTabActiveIndex(5);
    },
    { enabled, conflictBehavior: 'allow' }
  );
  useHotkey(
    'Mod+7',
    (e) => {
      e.preventDefault();
      store?.setTabActiveIndex(6);
    },
    { enabled, conflictBehavior: 'allow' }
  );
  useHotkey(
    'Mod+8',
    (e) => {
      e.preventDefault();
      store?.setTabActiveIndex(7);
    },
    { enabled, conflictBehavior: 'allow' }
  );
  useHotkey(
    'Mod+9',
    (e) => {
      e.preventDefault();
      store?.setTabActiveIndex(8);
    },
    { enabled, conflictBehavior: 'allow' }
  );
}
