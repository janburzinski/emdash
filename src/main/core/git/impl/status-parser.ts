export const MAX_STATUS_FILES = 10_000;

export class TooManyFilesChangedError extends Error {
  override readonly name = 'TooManyFilesChangedError';
  constructor() {
    super('Too many changed files');
  }
}

export interface IFileStatus {
  x: string;
  y: string;
  rename?: string;
  path: string;
}

export class StatusParser {
  private lastRaw = '';
  private result: IFileStatus[] = [];
  tooManyFiles = false;

  get status(): IFileStatus[] {
    return this.result;
  }

  update(chunk: string): void {
    let raw = this.lastRaw + chunk;
    let i = 0;
    let nextI: number | undefined;

    while ((nextI = this.parseEntry(raw, i)) !== undefined) {
      i = nextI;
      if (this.result.length > MAX_STATUS_FILES) {
        this.tooManyFiles = true;
        raw = '';
        i = 0;
        break;
      }
    }

    this.lastRaw = raw.slice(i);
  }

  private parseEntry(raw: string, i: number): number | undefined {
    if (i + 4 > raw.length) {
      return undefined;
    }

    const x = raw.charAt(i++);
    const y = raw.charAt(i++);
    // Space after XY
    i++;

    let rename: string | undefined;

    if (x === 'R' || y === 'R' || x === 'C') {
      const renameEnd = raw.indexOf('\0', i);
      if (renameEnd === -1) {
        return undefined;
      }
      rename = raw.substring(i, renameEnd);
      i = renameEnd + 1;
    }

    const pathEnd = raw.indexOf('\0', i);
    if (pathEnd === -1) {
      return undefined;
    }

    const path = raw.substring(i, pathEnd);
    // Nested git repo directory entries end with /
    if (path.length > 0 && path[path.length - 1] !== '/') {
      this.result.push({ x, y, rename, path });
    }

    return pathEnd + 1;
  }

  reset(): void {
    this.lastRaw = '';
    this.result = [];
    this.tooManyFiles = false;
  }
}
