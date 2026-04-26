import { Monitor, Moon, Sun } from '@phosphor-icons/react';
import React from 'react';
import type { Theme } from '@shared/app-settings';
import { useTheme } from '@renderer/lib/hooks/useTheme';
import { captureTelemetry } from '@renderer/utils/telemetryClient';
import { cn } from '@renderer/utils/utils';

const OPTIONS: ReadonlyArray<{
  value: Theme;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  ariaLabel: string;
}> = [
  {
    value: null,
    label: 'System',
    Icon: Monitor,
    ariaLabel: 'Set theme to system preference',
  },
  {
    value: 'emlight',
    label: 'Light',
    Icon: Sun,
    ariaLabel: 'Set theme to Emdash Light',
  },
  {
    value: 'emdark',
    label: 'Dark',
    Icon: Moon,
    ariaLabel: 'Set theme to Emdash Dark',
  },
];

const ThemeCard: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const handleSetTheme = (next: Theme) => {
    if (theme !== next) {
      captureTelemetry('setting_changed', { setting: 'theme' });
    }
    setTheme(next);
  };

  return (
    <div className="flex flex-col gap-2.5 px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <div className="text-sm text-foreground">Color mode</div>
        <div className="text-xs text-foreground-passive">Choose how Emdash looks.</div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map(({ value, label, Icon, ariaLabel }) => {
          const isActive = theme === value;
          return (
            <button
              key={label}
              type="button"
              onClick={() => handleSetTheme(value)}
              aria-pressed={isActive}
              aria-label={ariaLabel}
              className={cn(
                'flex flex-col items-center justify-center gap-1.5 rounded-lg border px-3 py-3 text-sm transition-colors',
                isActive
                  ? 'border-border bg-background-2 text-foreground'
                  : 'border-border/60 bg-background-1/50 text-foreground-muted hover:bg-background-1'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ThemeCard;
