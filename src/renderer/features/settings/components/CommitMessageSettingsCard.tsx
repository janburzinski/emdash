import React, { useState } from 'react';
import {
  COMMIT_MESSAGE_AGENT_IDS,
  COMMIT_MESSAGE_MODELS,
  COMMIT_MESSAGE_REASONINGS,
  isValidModelForAgent,
  isValidReasoningForAgent,
  type CommitMessageAgentId,
} from '@shared/commit-message';
import { useAppSettingsKey } from '@renderer/features/settings/use-app-settings-key';
import AgentLogo from '@renderer/lib/components/agent-logo';
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from '@renderer/lib/ui/combobox';
import { Textarea } from '@renderer/lib/ui/textarea';
import { agentConfig } from '@renderer/utils/agentConfig';
import { cn } from '@renderer/utils/utils';
import { SettingRow } from './SettingRow';

const DEFAULT_VALUE = '__default__';

type Option = {
  value: string;
  label: string;
  trigger: React.ReactNode;
  item: React.ReactNode;
};

export function CommitMessageSettingsCard() {
  const { value, update, isLoading, isSaving } = useAppSettingsKey('commitMessage');
  const agent = value?.agent ?? null;
  const model = value?.model ?? null;
  const reasoning = value?.reasoning ?? null;
  const instructions = value?.instructions ?? '';
  const disabled = isLoading || isSaving;

  const handleAgentChange = (next: string) => {
    if (next === DEFAULT_VALUE) {
      update({ agent: null, model: null, reasoning: null });
      return;
    }
    if (COMMIT_MESSAGE_AGENT_IDS.includes(next as CommitMessageAgentId)) {
      const nextAgent = next as CommitMessageAgentId;
      const keepModel = model && isValidModelForAgent(nextAgent, model) ? model : null;
      const keepReasoning =
        reasoning && isValidReasoningForAgent(nextAgent, reasoning) ? reasoning : null;
      update({ agent: nextAgent, model: keepModel, reasoning: keepReasoning });
    }
  };

  const handleModelChange = (next: string) => {
    if (!agent) return;
    if (next === DEFAULT_VALUE) {
      update({ model: null });
      return;
    }
    if (isValidModelForAgent(agent, next)) {
      update({ model: next });
    }
  };

  const handleReasoningChange = (next: string) => {
    if (!agent) return;
    if (next === DEFAULT_VALUE) {
      update({ reasoning: null });
      return;
    }
    if (isValidReasoningForAgent(agent, next)) {
      update({ reasoning: next });
    }
  };

  const agentOptions: Option[] = [
    {
      value: DEFAULT_VALUE,
      label: 'Off (manual)',
      trigger: <span className="truncate text-foreground-muted">Off (manual)</span>,
      item: <span>Off (manual)</span>,
    },
    ...COMMIT_MESSAGE_AGENT_IDS.map((id): Option => {
      const config = agentConfig[id];
      const node = (
        <span className="flex min-w-0 items-center gap-2">
          <AgentLogo
            logo={config.logo}
            alt={config.alt}
            isSvg={config.isSvg}
            invertInDark={config.invertInDark}
            className="h-4 w-4 shrink-0 rounded-sm"
          />
          <span className="truncate">{config.name}</span>
        </span>
      );
      return { value: id, label: config.name, trigger: node, item: node };
    }),
  ];

  const modelOptions: Option[] = agent
    ? [
        {
          value: DEFAULT_VALUE,
          label: 'Default',
          trigger: <span className="truncate text-foreground-muted">Default</span>,
          item: <span>Default</span>,
        },
        ...COMMIT_MESSAGE_MODELS[agent].map(
          (m): Option => ({
            value: m.id,
            label: m.label,
            trigger: <span className="truncate">{m.label}</span>,
            item: <span>{m.label}</span>,
          })
        ),
      ]
    : [];

  const reasoningOptions: Option[] = agent
    ? [
        {
          value: DEFAULT_VALUE,
          label: 'Default',
          trigger: <span className="truncate text-foreground-muted">Default</span>,
          item: <span>Default</span>,
        },
        ...COMMIT_MESSAGE_REASONINGS[agent].map(
          (r): Option => ({
            value: r.id,
            label: r.label,
            trigger: <span className="truncate">{r.label}</span>,
            item: <span>{r.label}</span>,
          })
        ),
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <SettingRow
        title="Commit message agent"
        description="Generate commit messages with AI from a sparkles button on the commit card. Set to off to type messages manually."
        control={
          <ComboboxField
            options={agentOptions}
            value={agent ?? DEFAULT_VALUE}
            onChange={handleAgentChange}
            disabled={disabled}
          />
        }
      />
      {agent && (
        <SettingRow
          title="Model"
          description={`Specific model for ${agentConfig[agent].name}. Leave on default to use the agent's configured default.`}
          control={
            <ComboboxField
              options={modelOptions}
              value={model ?? DEFAULT_VALUE}
              onChange={handleModelChange}
              disabled={disabled}
            />
          }
        />
      )}
      {agent && (
        <SettingRow
          title="Reasoning intensity"
          description="Higher intensity = more thinking before answering. Defaults to whatever the agent picks."
          control={
            <ComboboxField
              options={reasoningOptions}
              value={reasoning ?? DEFAULT_VALUE}
              onChange={handleReasoningChange}
              disabled={disabled}
            />
          }
        />
      )}
      <div className="flex flex-col gap-1.5">
        <p className="text-sm text-foreground">Custom instructions</p>
        <p className="text-xs text-foreground-passive">
          Extra guidance the agent will follow on top of the default conventional-commit prompt.
        </p>
        <Textarea
          key={instructions}
          defaultValue={instructions}
          placeholder="e.g. always reference the JIRA ticket from the branch name"
          onBlur={(e) => {
            const next = e.target.value;
            if (next !== instructions) update({ instructions: next });
          }}
          className="min-h-24 px-3 py-2.5 text-[14px] leading-relaxed"
          disabled={disabled || !agent}
        />
      </div>
    </div>
  );
}

function ComboboxField({
  options,
  value,
  onChange,
  disabled,
}: {
  options: Option[];
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="w-[200px] shrink-0">
      <Combobox
        items={options}
        value={selected ?? null}
        onValueChange={(item: Option | null) => {
          if (!item) return;
          onChange(item.value);
          setOpen(false);
        }}
        open={open}
        onOpenChange={disabled ? undefined : setOpen}
        isItemEqualToValue={(a: Option, b: Option) => a.value === b.value}
      >
        <ComboboxTrigger
          disabled={disabled}
          className={cn(
            'flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-transparent px-2.5 py-1 text-sm outline-none',
            disabled && 'cursor-not-allowed opacity-60'
          )}
        >
          {selected?.trigger}
        </ComboboxTrigger>
        <ComboboxContent className="min-w-(--anchor-width)">
          <ComboboxList className="py-1">
            <ComboboxCollection>
              {(item: Option) => (
                <ComboboxItem key={item.value} value={item}>
                  {item.item}
                </ComboboxItem>
              )}
            </ComboboxCollection>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
