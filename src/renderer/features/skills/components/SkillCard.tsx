import { Check, Plus } from '@phosphor-icons/react';
import React from 'react';
import type { CatalogSkill } from '@shared/skills/types';
import { getSkillSourceMeta } from './skill-source';
import SkillIconRenderer from './SkillIconRenderer';

interface SkillCardProps {
  skill: CatalogSkill;
  onSelect: (skill: CatalogSkill) => void;
  onInstall: (skillId: string) => void;
}

const SkillCard: React.FC<SkillCardProps> = ({ skill, onSelect, onInstall }) => {
  const sourceMeta = getSkillSourceMeta(skill.source);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(skill)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(skill);
        }
      }}
      className="group flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/40"
    >
      <SkillIconRenderer skill={skill} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm text-foreground">{skill.displayName}</span>
          {sourceMeta && (
            <img
              src={sourceMeta.logoUrl}
              alt={`From ${sourceMeta.label} skill library`}
              title={`From ${sourceMeta.label} skill library`}
              className="h-3 w-3 shrink-0 rounded-sm"
              loading="lazy"
            />
          )}
        </div>
        <div className="truncate text-xs text-foreground-muted">{skill.description}</div>
      </div>
      <div className="flex shrink-0 items-center">
        {skill.installed ? (
          <Check className="h-4 w-4 text-foreground-muted" aria-label="Installed" />
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInstall(skill.id);
            }}
            className="rounded-md p-1.5 text-foreground-muted opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
            aria-label={`Install ${skill.displayName}`}
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default SkillCard;
