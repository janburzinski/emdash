import type { DiffLine, GitChangeStatus } from '@shared/git';

export const MAX_DIFF_CONTENT_BYTES = 512 * 1024;

export const MAX_DIFF_OUTPUT_BYTES = 10 * 1024 * 1024;

const DIFF_HEADER_PREFIXES = [
  'diff ',
  'index ',
  '--- ',
  '+++ ',
  '@@',
  'new file mode',
  'old file mode',
  'deleted file mode',
  'similarity index',
  'rename from',
  'rename to',
  'Binary files',
];

export function mapStatus(code: string): GitChangeStatus {
  if (code.includes('U') || code === 'AA' || code === 'DD') return 'conflicted';
  if (code.includes('A') || code.includes('?')) return 'added';
  if (code.includes('D')) return 'deleted';
  if (code.includes('R')) return 'renamed';
  return 'modified';
}

export function stripTrailingNewline(s: string): string {
  return s.endsWith('\n') ? s.slice(0, -1) : s;
}

export function parseDiffLines(stdout: string): { lines: DiffLine[]; isBinary: boolean } {
  const result: DiffLine[] = [];
  for (const line of stdout.split('\n')) {
    if (!line) continue;
    if (DIFF_HEADER_PREFIXES.some((p) => line.startsWith(p))) continue;
    const prefix = line[0];
    const content = line.slice(1);
    if (prefix === '\\') continue;
    if (prefix === ' ') result.push({ left: content, right: content, type: 'context' });
    else if (prefix === '-') result.push({ left: content, type: 'del' });
    else if (prefix === '+') result.push({ right: content, type: 'add' });
    else result.push({ left: line, right: line, type: 'context' });
  }
  const isBinary = result.length === 0 && stdout.includes('Binary files');
  return { lines: result, isBinary };
}

export function computeBaseRef(
  baseRef?: string | null,
  remote?: string | null,
  branch?: string | null
): string {
  const remoteName = (() => {
    const trimmed = (remote ?? '').trim();
    if (!trimmed) return '';
    if (/^[A-Za-z0-9._-]+$/.test(trimmed) && !trimmed.includes('://')) return trimmed;
    return 'origin';
  })();

  const normalize = (value?: string | null): string | undefined => {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed || trimmed.includes('://')) return undefined;

    if (trimmed.includes('/')) {
      const [head, ...rest] = trimmed.split('/');
      const branchPart = rest.join('/').replace(/^\/+/, '');
      if (head && branchPart) return `${head}/${branchPart}`;
      if (!head && branchPart) {
        return remoteName ? `${remoteName}/${branchPart}` : branchPart;
      }
      return undefined;
    }

    const suffix = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
    return remoteName ? `${remoteName}/${suffix}` : suffix;
  };

  const defaultBranch = remoteName ? `${remoteName}/main` : 'main';
  return normalize(baseRef) ?? normalize(branch) ?? defaultBranch;
}
