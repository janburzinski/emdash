import React from 'react';
import { MicroLabel } from '@renderer/lib/ui/label';
import { cn } from '@renderer/utils/utils';

interface SettingsCardProps {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** When true, children are rendered raw (no auto divide). */
  flush?: boolean;
}

export function SettingsCard({
  title,
  action,
  children,
  className,
  bodyClassName,
  flush,
}: SettingsCardProps) {
  return (
    <section
      className={cn('overflow-hidden rounded-xl border border-border/60 bg-muted/10', className)}
    >
      {title && (
        <header className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
          <MicroLabel className="uppercase tracking-wider text-foreground-passive">
            {title}
          </MicroLabel>
          {action && <div className="flex shrink-0 items-center">{action}</div>}
        </header>
      )}
      <div className={cn(!flush && '[&>*+*]:border-t [&>*+*]:border-border/60', bodyClassName)}>
        {children}
      </div>
    </section>
  );
}
