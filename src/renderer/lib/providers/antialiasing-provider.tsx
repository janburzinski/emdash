import { useLayoutEffect, type ReactNode } from 'react';
import { useAppSettingsKey } from '@renderer/features/settings/use-app-settings-key';
import { useLocalStorage } from '@renderer/lib/hooks/useLocalStorage';

function applyAntialiasing(enabled: boolean) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (enabled) {
    root.classList.add('antialiased');
  } else {
    root.classList.remove('antialiased');
  }
}

export function AntialiasingProvider({ children }: { children: ReactNode }) {
  const { value: iface, isLoading } = useAppSettingsKey('interface');
  const [, setCachedAntialiasing] = useLocalStorage<boolean>('emdash-antialiasing', true);

  const antialiasing = iface?.antialiasing ?? true;

  useLayoutEffect(() => {
    if (isLoading) return;
    applyAntialiasing(antialiasing);
    setCachedAntialiasing(antialiasing);
  }, [antialiasing, isLoading, setCachedAntialiasing]);

  return <>{children}</>;
}
