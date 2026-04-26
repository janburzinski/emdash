import { Plug } from '@phosphor-icons/react';
import React from 'react';
import { coerceRawSvgContent, prepareInlineSvgMarkup } from './mcp-icon-data';

const svgs = import.meta.glob('../../assets/images/mcp/*.svg', { query: '?raw', eager: true });
const pngs = import.meta.glob('../../assets/images/mcp/*.png', { eager: true, import: 'default' });

function keyFromPath(path: string): string {
  return path
    .split('/')
    .pop()!
    .replace(/\.\w+$/, '');
}

const svgByKey = new Map(
  Object.entries(svgs).map(([p, d]) => [keyFromPath(p), coerceRawSvgContent(d)])
);
const pngByKey = new Map(Object.entries(pngs).map(([p, d]) => [keyFromPath(p), d as string]));

function getIcon(
  key: string
): { type: 'svg'; data: string } | { type: 'png'; url: string } | undefined {
  const svg = svgByKey.get(key);
  if (typeof svg === 'string') return { type: 'svg', data: svg };
  const png = pngByKey.get(key);
  if (png) return { type: 'png', url: png };
  return undefined;
}

type McpIconSize = 'sm' | 'md';

const sizeClasses: Record<McpIconSize, { container: string; icon: string }> = {
  sm: { container: 'h-5 w-5', icon: 'h-4 w-4' },
  md: { container: 'h-6 w-6', icon: 'h-5 w-5' },
};

export const McpServerIcon: React.FC<{
  name: string;
  iconKey?: string;
  size?: McpIconSize;
}> = ({ name, iconKey, size = 'sm' }) => {
  const icon = iconKey ? getIcon(iconKey) : undefined;
  const { container, icon: iconSize } = sizeClasses[size];
  const wrapper = `flex ${container} shrink-0 items-center justify-center`;

  if (icon?.type === 'svg') {
    const processed = prepareInlineSvgMarkup(icon.data);
    return <div className={wrapper} dangerouslySetInnerHTML={{ __html: processed }} />;
  }

  if (icon?.type === 'png') {
    return (
      <div className={wrapper}>
        <img
          src={icon.url}
          alt={name}
          className="h-full w-full object-contain brightness-0 dark:invert"
        />
      </div>
    );
  }

  return (
    <div className={wrapper}>
      <Plug className={`${iconSize} text-foreground-muted`} />
    </div>
  );
};
