export interface SkillFrontmatter {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  'allowed-tools'?: string;
}

export interface CatalogSkill {
  id: string;
  displayName: string;
  description: string;
  source: 'openai' | 'anthropic' | 'local';
  sourceUrl?: string;
  iconUrl?: string;
  brandColor?: string;
  defaultPrompt?: string;
  skillMdContent?: string;
  frontmatter: SkillFrontmatter;
  installed: boolean;
  localPath?: string;
}

export interface CatalogIndex {
  version: number;
  lastUpdated: string;
  skills: CatalogSkill[];
}

export interface DetectedAgent {
  id: string;
  name: string;
  configDir: string;
  installed: boolean;
}
