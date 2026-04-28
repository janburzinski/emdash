import type { Branch } from '@shared/git';

export type StoredBranch = Branch;

export function toStoredBranch(branch: Branch): StoredBranch {
  return branch;
}

export function fromStoredBranch(branch: StoredBranch): Branch {
  return branch;
}
