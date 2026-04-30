import { and, count, desc, eq, inArray } from 'drizzle-orm';
import type { PullRequest } from '@shared/pull-requests';
import type { Task } from '@shared/tasks';
import { fetchRelated } from '@main/core/pull-requests/pr-query-service';
import { db } from '@main/db/client';
import { conversations, projectRemotes, pullRequests, tasks } from '@main/db/schema';
import { mapTaskRowToTask } from './core';

export async function getTasks(projectId?: string): Promise<Task[]> {
  const rows = projectId
    ? await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.projectId, projectId)))
        .orderBy(desc(tasks.updatedAt))
    : await db.select().from(tasks).orderBy(desc(tasks.updatedAt));

  if (rows.length === 0) return [];

  const taskIds = rows.map((r) => r.id);

  const convRows = await db
    .select({
      taskId: conversations.taskId,
      provider: conversations.provider,
      count: count(),
    })
    .from(conversations)
    .where(inArray(conversations.taskId, taskIds))
    .groupBy(conversations.taskId, conversations.provider);

  const convByTask = new Map<string, Record<string, number>>();
  for (const { taskId, provider, count: c } of convRows) {
    const rec = convByTask.get(taskId) ?? {};
    rec[provider ?? 'unknown'] = c;
    convByTask.set(taskId, rec);
  }

  const prsByTask = await loadPrsByTask(rows);

  return rows.map((row) => ({
    ...mapTaskRowToTask(row),
    prs: prsByTask.get(row.id) ?? [],
    conversations: convByTask.get(row.id) ?? {},
  }));
}

/**
 * Bulk-load PRs for the given task rows, grouped by task id.
 *
 * Eager-loads on the initial getTasks call so the sidebar can render PR badges
 * on first paint instead of flashing in after per-task reloads.
 */
async function loadPrsByTask(
  rows: (typeof tasks.$inferSelect)[]
): Promise<Map<string, PullRequest[]>> {
  const result = new Map<string, PullRequest[]>();

  const branchedRows = rows.filter(
    (r): r is (typeof rows)[number] & { taskBranch: string } => !!r.taskBranch
  );
  if (branchedRows.length === 0) return result;

  const projectIds = [...new Set(branchedRows.map((r) => r.projectId))];
  const branches = [...new Set(branchedRows.map((r) => r.taskBranch))];

  const remoteRows = await db
    .select({
      projectId: projectRemotes.projectId,
      remoteUrl: projectRemotes.remoteUrl,
    })
    .from(projectRemotes)
    .where(inArray(projectRemotes.projectId, projectIds));

  if (remoteRows.length === 0) return result;

  const remoteUrlsByProject = new Map<string, Set<string>>();
  const allRemoteUrls = new Set<string>();
  for (const r of remoteRows) {
    const set = remoteUrlsByProject.get(r.projectId) ?? new Set<string>();
    set.add(r.remoteUrl);
    remoteUrlsByProject.set(r.projectId, set);
    allRemoteUrls.add(r.remoteUrl);
  }

  const prRows = await db
    .select()
    .from(pullRequests)
    .where(
      and(
        inArray(pullRequests.headRefName, branches),
        inArray(pullRequests.repositoryUrl, [...allRemoteUrls])
      )
    );

  if (prRows.length === 0) return result;

  const enriched = await fetchRelated(prRows);
  const prsByBranchAndRepo = new Map<string, PullRequest[]>();
  for (const pr of enriched) {
    const key = `${pr.repositoryUrl}\u0000${pr.headRefName}`;
    const arr = prsByBranchAndRepo.get(key) ?? [];
    arr.push(pr);
    prsByBranchAndRepo.set(key, arr);
  }

  for (const row of branchedRows) {
    const remotes = remoteUrlsByProject.get(row.projectId);
    if (!remotes) continue;
    const matched: PullRequest[] = [];
    for (const remoteUrl of remotes) {
      const key = `${remoteUrl}\u0000${row.taskBranch}`;
      const prs = prsByBranchAndRepo.get(key);
      if (prs) matched.push(...prs);
    }
    if (matched.length > 0) result.set(row.id, matched);
  }

  return result;
}
