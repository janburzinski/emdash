import { and, count, desc, eq, inArray } from 'drizzle-orm';
import type { PullRequest } from '@shared/pull-requests';
import { Task } from '@shared/tasks';
import { prQueryService } from '@main/core/pull-requests/pr-query-service';
import { db } from '@main/db/client';
import { conversations, tasks } from '@main/db/schema';
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

  const convRowsPromise = db
    .select({
      taskId: conversations.taskId,
      provider: conversations.provider,
      count: count(),
    })
    .from(conversations)
    .where(inArray(conversations.taskId, taskIds))
    .groupBy(conversations.taskId, conversations.provider);

  const taskBranches = projectId
    ? rows.map((r) => r.taskBranch).filter((b): b is string => !!b)
    : [];
  const prsByBranchPromise: Promise<Map<string, PullRequest[]>> =
    projectId && taskBranches.length > 0
      ? prQueryService.getPullRequestsByTaskBranches(projectId, taskBranches)
      : Promise.resolve(new Map());

  const [convRows, prsByBranch] = await Promise.all([convRowsPromise, prsByBranchPromise]);

  const convByTask = new Map<string, Record<string, number>>();
  for (const { taskId, provider, count: c } of convRows) {
    const rec = convByTask.get(taskId) ?? {};
    rec[provider ?? 'unknown'] = c;
    convByTask.set(taskId, rec);
  }

  return rows.map((row) => {
    const prs = row.taskBranch ? (prsByBranch.get(row.taskBranch) ?? []) : [];
    return mapTaskRowToTask(row, prs, convByTask.get(row.id) ?? {});
  });
}
