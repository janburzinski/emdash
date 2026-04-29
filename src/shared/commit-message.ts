export const COMMIT_MESSAGE_AGENT_IDS = ['codex', 'claude', 'opencode'] as const;
export type CommitMessageAgentId = (typeof COMMIT_MESSAGE_AGENT_IDS)[number];

export type CommitMessageModelOption = {
  id: string;
  label: string;
};

export type CommitMessageReasoningOption = {
  id: string;
  label: string;
};

/** CLI-validated model identifiers per agent. */
export const COMMIT_MESSAGE_MODELS: Record<CommitMessageAgentId, CommitMessageModelOption[]> = {
  codex: [
    { id: 'gpt-5.5', label: 'GPT-5.5' },
    { id: 'gpt-5.4', label: 'GPT-5.4' },
    { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini' },
  ],
  claude: [
    { id: 'opus', label: 'Claude Opus' },
    { id: 'sonnet', label: 'Claude Sonnet' },
    { id: 'haiku', label: 'Claude Haiku' },
  ],
  opencode: [
    { id: 'anthropic/claude-opus-4-7', label: 'Claude Opus 4.7' },
    { id: 'anthropic/claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { id: 'anthropic/claude-haiku-4-5', label: 'Claude Haiku 4.5' },
    { id: 'openai/gpt-5.5', label: 'GPT-5.5' },
    { id: 'openai/gpt-5.4', label: 'GPT-5.4' },
    { id: 'openai/gpt-5.4-mini', label: 'GPT-5.4 mini' },
  ],
};

/**
 * Reasoning intensity levels that each CLI accepts.
 * - codex: `-c model_reasoning_effort=<level>` accepts minimal|low|medium|high.
 * - claude: `--effort <level>` accepts low|medium|high|xhigh|max.
 * - opencode: `--variant <id>` accepts minimal|high|max (provider-specific).
 */
export const COMMIT_MESSAGE_REASONINGS: Record<
  CommitMessageAgentId,
  CommitMessageReasoningOption[]
> = {
  codex: [
    { id: 'minimal', label: 'Minimal' },
    { id: 'low', label: 'Low' },
    { id: 'medium', label: 'Medium' },
    { id: 'high', label: 'High' },
  ],
  claude: [
    { id: 'low', label: 'Low' },
    { id: 'medium', label: 'Medium' },
    { id: 'high', label: 'High' },
    { id: 'xhigh', label: 'Extra high' },
    { id: 'max', label: 'Max' },
  ],
  opencode: [
    { id: 'minimal', label: 'Minimal' },
    { id: 'high', label: 'High' },
    { id: 'max', label: 'Max' },
  ],
};

export function isValidModelForAgent(agent: CommitMessageAgentId, modelId: string): boolean {
  return COMMIT_MESSAGE_MODELS[agent].some((m) => m.id === modelId);
}

export function isValidReasoningForAgent(agent: CommitMessageAgentId, id: string): boolean {
  return COMMIT_MESSAGE_REASONINGS[agent].some((r) => r.id === id);
}
