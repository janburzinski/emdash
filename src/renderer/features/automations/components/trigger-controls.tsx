import { Check, ChevronDown, Clock, Zap } from 'lucide-react';
import React from 'react';
import {
  TRIGGER_INTEGRATION_MAP,
  TRIGGER_TYPE_LABELS,
  type TriggerConfig,
  type TriggerType,
} from '@shared/automations/types';
import { ISSUE_PROVIDER_META } from '@renderer/features/integrations/issue-provider-meta';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@renderer/lib/ui/dropdown-menu';
import { Input } from '@renderer/lib/ui/input';
import { cn } from '@renderer/utils/utils';

export const TRIGGER_TYPES: TriggerType[] = [
  'github_issue',
  'linear_issue',
  'jira_issue',
  'gitlab_issue',
  'forgejo_issue',
  'plain_thread',
];

export interface TriggerFormValue {
  triggerType: TriggerType;
  assigneeFilter: string;
}

export function stateToTriggerConfig(s: TriggerFormValue): TriggerConfig | null {
  const config: TriggerConfig = {};
  if (s.assigneeFilter.trim()) config.assigneeFilter = s.assigneeFilter.trim();
  return Object.keys(config).length > 0 ? config : null;
}

export function triggerFilterCount(s: TriggerFormValue): number {
  return s.assigneeFilter.trim() ? 1 : 0;
}

export function TriggerTypeIcon({
  triggerType,
  className,
}: {
  triggerType: TriggerType;
  className?: string;
}) {
  const providerId = TRIGGER_INTEGRATION_MAP[triggerType];
  const meta = ISSUE_PROVIDER_META[providerId];
  if (!meta) return <Zap className={className} />;
  return (
    <img
      src={meta.logo}
      alt={meta.displayName}
      className={cn(className, meta.invertInDark && 'dark:invert')}
    />
  );
}

type TriggerPopoverBodyProps = {
  value: TriggerFormValue;
  onChange: (patch: Partial<TriggerFormValue>) => void;
  onSwitchMode?: () => void;
};

export function TriggerPopoverBody({ value, onChange, onSwitchMode }: TriggerPopoverBodyProps) {
  return (
    <div className="flex flex-col">
      {onSwitchMode && (
        <div className="flex justify-center px-3 pt-3 pb-2">
          <div className="inline-flex rounded-md border border-border bg-muted p-0.5">
            <button
              type="button"
              onClick={onSwitchMode}
              className="inline-flex items-center gap-1.5 rounded-sm px-3 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Clock className="h-3 w-3" />
              Schedule
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-sm bg-background px-3 py-1 text-[11px] font-medium text-foreground shadow-sm"
            >
              <Zap className="h-3 w-3" />
              Trigger
            </button>
          </div>
        </div>
      )}
      <div className="px-3 pb-2">
        <FieldRow label="Source">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex h-7 w-full items-center justify-between gap-1.5 rounded-md border border-border bg-transparent px-2.5 text-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <div className="flex items-center gap-1.5">
                    <TriggerTypeIcon triggerType={value.triggerType} className="h-3.5 w-3.5" />
                    <span>{TRIGGER_TYPE_LABELS[value.triggerType]}</span>
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground/70" />
                </button>
              }
            />
            <DropdownMenuContent align="start">
              {TRIGGER_TYPES.map((t) => (
                <DropdownMenuItem key={t} onClick={() => onChange({ triggerType: t })}>
                  <TriggerTypeIcon triggerType={t} className="h-4 w-4" />
                  <span className="flex-1">{TRIGGER_TYPE_LABELS[t]}</span>
                  {value.triggerType === t && <Check className="h-3.5 w-3.5" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </FieldRow>
      </div>

      <div className="border-t border-border/60" />
      <SectionHeader>Filters</SectionHeader>
      <div className="flex flex-col gap-2 px-3 pb-3">
        <FieldRow label="Assignee">
          <Input
            value={value.assigneeFilter}
            onChange={(e) => onChange({ assigneeFilter: e.target.value })}
            placeholder="username"
            className="h-7 text-xs"
          />
        </FieldRow>
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-16 shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-2.5 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
      {children}
    </div>
  );
}
