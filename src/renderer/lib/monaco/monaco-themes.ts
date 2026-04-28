import type { Monaco } from '@monaco-editor/react';

type MonacoColors = Record<string, string>;

function cssColorToHex(cssColor: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = cssColor.trim();
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return a < 255 ? `#${hex(r)}${hex(g)}${hex(b)}${hex(a)}` : `#${hex(r)}${hex(g)}${hex(b)}`;
}

function readMonacoVarsForTheme(cssClass: 'emlight' | 'emdark'): MonacoColors {
  const el = document.createElement('div');
  el.className = cssClass;
  el.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;';
  document.body.appendChild(el);
  const style = getComputedStyle(el);

  const get = (v: string) => style.getPropertyValue(v).trim();

  const mapping: Array<[string, string]> = [
    ['--monaco-bg', 'editor.background'],
    ['--monaco-fg', 'editor.foreground'],
    ['--monaco-line-highlight', 'editor.lineHighlightBackground'],
    ['--monaco-line-number', 'editorLineNumber.foreground'],
    ['--monaco-gutter', 'editorGutter.background'],
    ['--monaco-inserted-text-bg', 'diffEditor.insertedTextBackground'],
    ['--monaco-inserted-line-bg', 'diffEditor.insertedLineBackground'],
    ['--monaco-inserted-text-border', 'diffEditor.insertedTextBorder'],
    ['--monaco-removed-text-bg', 'diffEditor.removedTextBackground'],
    ['--monaco-removed-line-bg', 'diffEditor.removedLineBackground'],
    ['--monaco-removed-text-border', 'diffEditor.removedTextBorder'],
    ['--monaco-unchanged-region-bg', 'diffEditor.unchangedRegionBackground'],
    ['--monaco-diff-border', 'diffEditor.border'],
    ['--monaco-diff-diagonal-fill', 'diffEditor.diagonalFill'],
  ];

  const colors: MonacoColors = {};
  for (const [cssVar, monacoToken] of mapping) {
    const value = get(cssVar);
    if (value) {
      colors[monacoToken] = cssColorToHex(value);
    }
  }

  el.remove();
  return colors;
}

export function defineMonacoThemes(monaco: Monaco): void {
  monaco.editor.defineTheme('custom-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: readMonacoVarsForTheme('emdark'),
  });

  monaco.editor.defineTheme('custom-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: readMonacoVarsForTheme('emlight'),
  });
}

export function getMonacoTheme(effectiveTheme: string): string {
  return effectiveTheme === 'emlight' ? 'custom-light' : 'custom-dark';
}
