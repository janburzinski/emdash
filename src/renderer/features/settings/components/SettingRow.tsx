import React from 'react';
import { cn } from '@renderer/utils/utils';

interface SettingRowProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  control?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function SettingRow({ title, description, control, children, className }: SettingRowProps) {
  return (
    <div className={cn('flex flex-col gap-2 px-4 py-3', className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-1 basis-64 flex-col gap-0.5">
          <div className="break-words text-sm text-foreground">{title}</div>
          {description && (
            <div className="break-words text-xs text-foreground-passive">{description}</div>
          )}
        </div>
        {control && <div className="ml-auto flex shrink-0 items-center gap-1.5">{control}</div>}
      </div>
      {children}
    </div>
  );
}
