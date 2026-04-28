import type { FileWatchEvent } from '@shared/fs';

export interface FileWatcher {
  update(paths: string[]): void;
  close(): void;
}

export interface FileEntry {
  path: string;
  type: 'file' | 'dir';
  size?: number;
  mtime?: Date;
  ctime?: Date;
  mode?: number;
}

export interface ListOptions {
  recursive?: boolean;
  includeHidden?: boolean;
  filter?: string;
  maxEntries?: number;
  timeBudgetMs?: number;
}

export interface FileListResult {
  entries: FileEntry[];
  total: number;
  truncated?: boolean;
  truncateReason?: 'maxEntries' | 'timeBudget';
  durationMs?: number;
}

export interface ReadResult {
  content: string;
  truncated: boolean;
  totalSize: number;
}

export interface WriteResult {
  success: boolean;
  bytesWritten: number;
  error?: string;
}

export interface SearchOptions {
  pattern?: string;
  filePattern?: string;
  maxResults?: number;
  caseSensitive?: boolean;
  fileExtensions?: string[];
}

export interface SearchResult {
  matches: SearchMatch[];
  total: number;
  truncated?: boolean;
  filesSearched?: number;
}

export interface SearchMatch {
  filePath: string;
  line: number;
  column: number;
  content: string;
  preview?: string;
}

export interface FileSystemProvider {
  list(path: string, options?: ListOptions): Promise<FileListResult>;

  read(path: string, maxBytes?: number): Promise<ReadResult>;

  write(path: string, content: string): Promise<WriteResult>;

  exists(path: string): Promise<boolean>;

  stat(path: string): Promise<FileEntry | null>;

  search(query: string, options?: SearchOptions): Promise<SearchResult>;

  remove(
    path: string,
    options?: { recursive?: boolean }
  ): Promise<{ success: boolean; error?: string }>;

  realPath(path: string): Promise<string>;

  glob(pattern: string, options?: { cwd?: string; dot?: boolean }): Promise<string[]>;

  copyFile(src: string, dest: string): Promise<void>;

  readImage?(path: string): Promise<{
    success: boolean;
    dataUrl?: string;
    mimeType?: string;
    size?: number;
    error?: string;
  }>;

  mkdir(diPath: string, options?: { recursive?: boolean }): Promise<void>;

  watch?(
    callback: (events: FileWatchEvent[]) => void,
    options?: { debounceMs?: number }
  ): FileWatcher;
}

export class FileSystemError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly path?: string
  ) {
    super(message);
    this.name = 'FileSystemError';
  }
}

export const FileSystemErrorCodes = {
  PATH_ESCAPE: 'PATH_ESCAPE',
  NOT_FOUND: 'NOT_FOUND',
  IS_DIRECTORY: 'IS_DIRECTORY',
  NOT_DIRECTORY: 'NOT_DIRECTORY',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INVALID_PATH: 'INVALID_PATH',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN: 'UNKNOWN',
} as const;
