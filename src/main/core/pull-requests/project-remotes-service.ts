import { and, eq, notInArray } from 'drizzle-orm';
import type { Remote } from '@shared/git';
import { isGitHubUrl, normalizeGitHubUrl } from '@main/core/github/services/utils';
import { db } from '@main/db/client';
import { projectRemotes } from '@main/db/schema';

export async function syncProjectRemotes(projectId: string, remotes: Remote[]): Promise<void> {
  for (const r of remotes) {
    const remoteUrl = isGitHubUrl(r.url) ? normalizeGitHubUrl(r.url) : r.url;
    await db
      .insert(projectRemotes)
      .values({ projectId, remoteName: r.name, remoteUrl })
      .onConflictDoUpdate({
        target: [projectRemotes.projectId, projectRemotes.remoteName],
        set: { remoteUrl },
      });
  }

  if (remotes.length > 0) {
    await db.delete(projectRemotes).where(
      and(
        eq(projectRemotes.projectId, projectId),
        notInArray(
          projectRemotes.remoteName,
          remotes.map((r) => r.name)
        )
      )
    );
  } else {
    // No remotes at all — clear all rows for this project
    await db.delete(projectRemotes).where(eq(projectRemotes.projectId, projectId));
  }
}
