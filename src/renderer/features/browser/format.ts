import type { Annotation } from './types';

const HEADER = 'Browser context attached:';
const HTML_LIMIT = 1500;
const TEXT_LIMIT = 1500;
const ELEMENT_TEXT_LIMIT = 400;

export function formatAnnotationsAsMarkdown(annotations: Annotation[]): string {
  if (annotations.length === 0) return '';
  const blocks = annotations.map((annotation, index) => formatOne(annotation, index + 1));
  return [HEADER, '', ...blocks].join('\n');
}

function formatOne(annotation: Annotation, index: number): string {
  const note = annotation.note.trim();
  const noteLine = note ? `- Note: ${note}` : null;

  if (annotation.kind === 'element') {
    return [
      `### [${index}] Element pick — ${annotation.url}`,
      `- Selector: \`${annotation.selector}\``,
      `- Text: ${JSON.stringify(truncate(annotation.text, ELEMENT_TEXT_LIMIT))}`,
      '- HTML:',
      '```html',
      truncate(annotation.outerHtml, HTML_LIMIT),
      '```',
      noteLine,
    ]
      .filter((line): line is string => line !== null)
      .join('\n');
  }

  if (annotation.kind === 'text') {
    const quoted = truncate(annotation.text, TEXT_LIMIT)
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');
    return [`### [${index}] Text selection — ${annotation.url}`, quoted, noteLine]
      .filter((line): line is string => line !== null)
      .join('\n');
  }

  return [
    `### [${index}] Region screenshot — ${annotation.url}`,
    `- File: ${annotation.filePath}`,
    `- Rect: ${annotation.rect.width}×${annotation.rect.height} at (${annotation.rect.x}, ${annotation.rect.y})`,
    noteLine,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}
