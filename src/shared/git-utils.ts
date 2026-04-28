import type { Branch, Remote } from './git';

export const DEFAULT_REMOTE_NAME = 'origin';

export function selectPreferredRemote(
  configuredRemote: string | undefined,
  remotes: ReadonlyArray<Remote>
): Remote {
  const preferred = configuredRemote?.trim();
  const found = preferred ? remotes.find((r) => r.name === preferred) : undefined;
  return (
    found ??
    remotes.find((r) => r.name === DEFAULT_REMOTE_NAME) ??
    remotes[0] ?? { name: DEFAULT_REMOTE_NAME, url: '' }
  );
}

export function bareRefName(ref: string): string {
  const slash = ref.indexOf('/');
  return slash !== -1 ? ref.slice(slash + 1) : ref;
}

export function computeDefaultBranch(
  configured: string,
  branches: Branch[],
  remote: string,
  gitDefaultBranch: string
): string {
  const existsLocally = branches.some((b) => b.type === 'local' && b.branch === configured);
  const isOnRemote = branches.some(
    (b) => b.type === 'remote' && b.branch === configured && b.remote.name === remote
  );
  if (existsLocally || isOnRemote) return configured;
  return gitDefaultBranch;
}
