import type { ManagedFileKind } from './types';

export const RASTER_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp']);

export const BINARY_EXTS = new Set([
  'exe',
  'dll',
  'so',
  'dylib',
  'wasm',
  'zip',
  'tar',
  'gz',
  'bz2',
  '7z',
  'rar',
  'pdf',
  'db',
  'sqlite',
  'sqlite3',
  'class',
  'jar',
  'pyc',
  'o',
  'a',
  'lib',
  'bin',
  'dat',
  'pkg',
  'dmg',
  'iso',
  'ttf',
  'otf',
  'woff',
  'woff2',
  'eot',
  'mp3',
  'mp4',
  'wav',
  'ogg',
  'webm',
  'mov',
  'avi',
]);

export function getFileKind(filePath: string): Exclude<ManagedFileKind, 'too-large'> {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  if (RASTER_EXTS.has(ext)) return 'image';
  if (ext === 'svg') return 'svg';
  if (ext === 'md' || ext === 'mdx') return 'markdown';
  if (BINARY_EXTS.has(ext)) return 'binary';
  return 'text';
}

export function isBinaryForDiff(filePath: string): boolean {
  const kind = getFileKind(filePath);
  return kind === 'binary' || kind === 'image';
}
