export type DiffLine = { left?: string; right?: string; type: 'context' | 'add' | 'del' };

export type GitChangeStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'conflicted';

export type GitChange = {
  path: string;
  status: GitChangeStatus;
  additions: number;
  deletions: number;
};

export interface FullGitStatus {
  staged: GitChange[];
  unstaged: GitChange[];
  currentBranch: string | null;
  totalAdded: number;
  totalDeleted: number;
}

export interface DiffResult {
  lines: DiffLine[];
  isBinary?: boolean;
  originalContent?: string;
  modifiedContent?: string;
}

export interface GitInfo {
  isGitRepo: boolean;
  remote?: string;
  branch?: string;
  baseRef: string;
  rootPath: string;
}

export type GitHeadState = {
  headName?: string;
  isUnborn: boolean;
};

export type Remote = {
  name: string;
  url: string;
};

export type Branch =
  | { type: 'local'; branch: string; remote?: Remote }
  | { type: 'remote'; branch: string; remote: Remote };

export type BranchMetadata = {
  divergence?: { ahead: number; behind: number };
};

export type LocalBranch = Extract<Branch, { type: 'local' }> & BranchMetadata;
export type RemoteBranch = Extract<Branch, { type: 'remote' }>;

export type DiffMode = { kind: 'head' } | { kind: 'staged' };

export const HEAD_MODE: DiffMode = { kind: 'head' };
export const STAGED_MODE: DiffMode = { kind: 'staged' };

export const HEAD_REF = HEAD_MODE;
export const STAGED_REF = STAGED_MODE;

export type GitObjectRef =
  | { kind: 'branch'; branch: Branch }
  | { kind: 'commit'; sha: string }
  | { kind: 'tag'; name: string };

export type GitRef = DiffMode | GitObjectRef;

export type MergeBaseRange = { base: GitObjectRef; head: GitObjectRef };

export function toRangeString(range: MergeBaseRange): string {
  return `${toRefString(range.base)}...${toRefString(range.head)}`;
}

export function mergeBaseRange(base: GitObjectRef, head: GitObjectRef): MergeBaseRange {
  return { base, head };
}

export function toRefString(ref: GitObjectRef): string {
  switch (ref.kind) {
    case 'branch':
      return ref.branch.type === 'remote'
        ? `${ref.branch.remote.name}/${ref.branch.branch}`
        : ref.branch.branch;
    case 'commit':
      return ref.sha;
    case 'tag':
      return ref.name;
  }
}

export function gitRefToString(ref: GitRef): string {
  if (ref.kind === 'head') return 'HEAD';
  if (ref.kind === 'staged') return 'STAGED';
  return toRefString(ref);
}

export function refsEqual(a: GitRef, b: GitRef): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'head':
    case 'staged':
      return true;
    case 'branch': {
      const ab = a.branch;
      const bb = (b as typeof a).branch;
      if (ab.type !== bb.type) return false;
      if (ab.type === 'remote' && bb.type === 'remote') {
        return ab.remote.name === bb.remote.name && ab.branch === bb.branch;
      }
      return ab.branch === bb.branch;
    }
    case 'commit':
      return a.sha === (b as typeof a).sha;
    case 'tag':
      return a.name === (b as typeof a).name;
  }
}

export function branchRef(branch: Branch): GitObjectRef {
  return { kind: 'branch', branch };
}

export function remoteRef(remote: Remote | string, branch: string): GitObjectRef {
  const r: Remote = typeof remote === 'string' ? { name: remote, url: '' } : remote;
  return { kind: 'branch', branch: { type: 'remote', branch, remote: r } };
}

export function commitRef(sha: string): GitObjectRef {
  return { kind: 'commit', sha };
}

export type Commit = {
  hash: string;
  subject: string;
  body: string;
  author: string;
  date: string;
  isPushed: boolean;
  tags: string[];
};

export type CommitFile = {
  path: string;
  status: string;
  additions: number;
  deletions: number;
};

export type LocalBranchesPayload = {
  localBranches: LocalBranch[];
  currentBranch: string | null;
  isUnborn: boolean;
};

export type RemoteBranchesPayload = {
  remoteBranches: RemoteBranch[];
  remotes: { name: string; url: string }[];
  gitDefaultBranch: string;
};

export type FetchError =
  | { type: 'no_remote' }
  | { type: 'auth_failed'; message: string }
  | { type: 'network_error'; message: string }
  | { type: 'remote_not_found'; message: string }
  | { type: 'error'; message: string };

export type FetchPrForReviewError =
  | { type: 'not_found'; prNumber: number }
  | { type: 'error'; message: string };

export type CommitError =
  | { type: 'empty_message' }
  | { type: 'nothing_to_commit' }
  | { type: 'hook_failed'; message: string }
  | { type: 'error'; message: string };

export type CreateBranchError =
  | { type: 'already_exists'; name: string }
  | { type: 'invalid_base'; from: string }
  | { type: 'invalid_name'; name: string }
  | { type: 'error'; message: string };

export type RenameBranchError =
  | { type: 'already_exists'; name: string }
  | { type: 'remote_push_failed'; message: string }
  | { type: 'error'; message: string };

export type DeleteBranchError =
  | { type: 'unmerged'; branch: string }
  | { type: 'not_found'; branch: string }
  | { type: 'is_current'; branch: string }
  | { type: 'error'; message: string };

export type PushError =
  | { type: 'rejected'; message: string }
  | { type: 'auth_failed'; message: string }
  | { type: 'no_remote'; message?: string }
  | { type: 'hook_rejected'; message: string }
  | { type: 'network_error'; message: string }
  | { type: 'error'; message: string };

export type PullError =
  | { type: 'conflict'; conflictedFiles: string[]; message: string }
  | { type: 'no_upstream'; message: string }
  | { type: 'diverged'; message: string }
  | { type: 'auth_failed'; message: string }
  | { type: 'network_error'; message: string }
  | { type: 'error'; message: string };
