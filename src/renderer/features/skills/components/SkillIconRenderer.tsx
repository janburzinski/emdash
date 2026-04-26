import { PuzzlePiece, Sparkle } from '@phosphor-icons/react';
import React, { useState } from 'react';
import type { CatalogSkill } from '@shared/skills/types';
import { useTheme } from '@renderer/lib/hooks/useTheme';
import { resolveSkillIcon } from './skillIcons';

type SkillIconSize = 'sm' | 'md';

const sizeClasses: Record<SkillIconSize, { container: string; icon: string }> = {
  sm: { container: 'h-5 w-5', icon: 'h-4 w-4' },
  md: { container: 'h-6 w-6', icon: 'h-5 w-5' },
};

function processSvg(raw: string, fillColor: string): string {
  let svg = raw.replace(/\bwidth="[^"]*"/g, '').replace(/\bheight="[^"]*"/g, '');
  svg = svg.replace('<svg ', `<svg fill="${fillColor}" `);
  return svg.replace('<svg ', '<svg class="h-full w-full" ');
}

interface SkillIconRendererProps {
  skill: CatalogSkill;
  size?: SkillIconSize;
}

const SkillIconRenderer: React.FC<SkillIconRendererProps> = ({ skill, size = 'sm' }) => {
  const [imgError, setImgError] = useState(false);
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'emdark';

  const { container, icon } = sizeClasses[size];
  const wrapperClass = `flex ${container} shrink-0 items-center justify-center`;

  const svg = resolveSkillIcon(skill.id, skill.source);
  if (svg) {
    const html = processSvg(svg, isDark ? '#ffffff' : '#000000');
    return <div className={wrapperClass} dangerouslySetInnerHTML={{ __html: html }} />;
  }

  if (skill.iconUrl && !imgError) {
    const filter = isDark ? 'brightness(0) invert(1)' : 'brightness(0)';
    return (
      <div className={wrapperClass}>
        <img
          src={skill.iconUrl}
          alt=""
          className="h-full w-full object-contain"
          style={{ filter }}
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  const FallbackIcon = skill.source === 'local' ? PuzzlePiece : Sparkle;
  return (
    <div className={wrapperClass}>
      <FallbackIcon className={`${icon} text-foreground-muted`} />
    </div>
  );
};

export default SkillIconRenderer;
