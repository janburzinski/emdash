import * as os from 'os';
import * as path from 'path';

export interface AgentSyncTarget {
  id: string;
  name: string;
  getSkillDir: (skillId: string) => string;
  configDir: string;
}

const home = os.homedir();

export const agentTargets: AgentSyncTarget[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    configDir: path.join(home, '.claude'),
    getSkillDir: (skillId: string) => path.join(home, '.claude', 'commands', skillId),
  },
  {
    id: 'codex',
    name: 'Codex',
    configDir: path.join(home, '.codex'),
    getSkillDir: (skillId: string) => path.join(home, '.codex', 'skills', skillId),
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    configDir: path.join(home, '.config', 'opencode'),
    getSkillDir: (skillId: string) => path.join(home, '.config', 'opencode', 'skills', skillId),
  },
  {
    id: 'cursor',
    name: 'Cursor',
    configDir: path.join(home, '.cursor'),
    getSkillDir: (skillId: string) => path.join(home, '.cursor', 'skills', skillId),
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    configDir: path.join(home, '.gemini'),
    getSkillDir: (skillId: string) => path.join(home, '.gemini', 'skills', skillId),
  },
  {
    id: 'roo-code',
    name: 'Roo Code',
    configDir: path.join(home, '.roo'),
    getSkillDir: (skillId: string) => path.join(home, '.roo', 'skills', skillId),
  },
  {
    id: 'mistral-vibe',
    name: 'Mistral Vibe',
    configDir: path.join(home, '.vibe'),
    getSkillDir: (skillId: string) => path.join(home, '.vibe', 'skills', skillId),
  },
];

export const skillScanPaths: string[] = [
  // Auto-derive from agent targets (e.g. ~/.claude/commands, ~/.codex/skills)
  ...new Set(agentTargets.map((t) => path.dirname(t.getSkillDir('_placeholder')))),
  // Additional paths some agents read from (not covered by targets above)
  path.join(home, '.claude', 'skills'),
  path.join(home, '.agent', 'skills'),
  path.join(home, '.agents', 'skills'),
];
