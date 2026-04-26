import type { CatalogSkill } from '@shared/skills/types';

type SkillSource = CatalogSkill['source'];
type RemoteSkillSource = Exclude<SkillSource, 'local'>;

export interface SkillSourceMeta {
  label: string;
  logoUrl: string;
}

const SKILL_SOURCE_META: Record<RemoteSkillSource, SkillSourceMeta> = {
  openai: { label: 'OpenAI', logoUrl: 'https://github.com/openai.png' },
  anthropic: { label: 'Anthropic', logoUrl: 'https://github.com/anthropics.png' },
};

export function getSkillSourceMeta(source: SkillSource): SkillSourceMeta | null {
  if (source === 'local') return null;
  return SKILL_SOURCE_META[source];
}
