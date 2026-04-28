import type {
  Commit,
  CommitError,
  DiffMode,
  DiffResult,
  FetchError,
  FullGitStatus,
  GitChange,
  GitObjectRef,
  MergeBaseRange,
  PullError,
  PushError,
} from '@shared/git';
import type { Result } from '@shared/result';

export interface WorkspaceGitProvider {
  getStatus(): Promise<{ changes: GitChange[]; currentBranch: string | null }>;
  getFullStatus(): Promise<FullGitStatus>;
  getStagedChanges(): Promise<{
    changes: GitChange[];
    totalAdded: number;
    totalDeleted: number;
  }>;
  getUnstagedChanges(): Promise<{ changes: GitChange[] }>;
  getCurrentBranch(): Promise<string | null>;
  dispose(): void;
  getWorktreeGitDir(mainDotGitAbs: string): Promise<string>;
  getChangedFiles(base: DiffMode | GitObjectRef | MergeBaseRange): Promise<GitChange[]>;

  getFileAtRef(filePath: string, ref: string): Promise<string | null>;
  getFileAtIndex(filePath: string): Promise<string | null>;

  stageFiles(filePaths: string[]): Promise<void>;
  stageAllFiles(): Promise<void>;
  unstageFiles(filePaths: string[]): Promise<void>;
  unstageAllFiles(): Promise<void>;
  revertFiles(filePaths: string[]): Promise<void>;
  revertAllFiles(): Promise<void>;

  getLog(options?: {
    maxCount?: number;
    skip?: number;
    knownAheadCount?: number;
    preferredRemote?: string;
    base?: GitObjectRef;
    head?: GitObjectRef;
  }): Promise<{ commits: Commit[]; aheadCount: number }>;

  commit(message: string): Promise<Result<{ hash: string }, CommitError>>;
  fetch(remote?: string): Promise<Result<void, FetchError>>;
  push(preferredRemote?: string): Promise<Result<{ output: string }, PushError>>;
  publishBranch(
    branchName: string,
    remote?: string
  ): Promise<Result<{ output: string }, PushError>>;
  pull(): Promise<Result<{ output: string }, PullError>>;
}
