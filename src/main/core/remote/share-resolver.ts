import { eq } from 'drizzle-orm';
import { makePtySessionId } from '@shared/ptySessionId';
import type { RemoteSessionMeta, RemoteShareInfo } from '@shared/remote';
import { ptySessionRegistry } from '@main/core/pty/pty-session-registry';
import { db } from '@main/db/client';
import { conversations, tasks, terminals } from '@main/db/schema';

/**
 * Resolve everything the embedded HTTP server needs for a given share token.
 * Returns the task metadata and the current list of PTY-backed sessions
 * (conversations + terminals) addressable through the share.
 *
 * Sessions are deterministic via `makePtySessionId(projectId, taskId, leafId)`,
 * matching how `LocalConversationProvider`/terminal providers register them.
 */
export async function resolveShareInfo(taskId: string): Promise<RemoteShareInfo | undefined> {
  const [taskRow] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!taskRow) return undefined;

  const [convRows, terminalRows] = await Promise.all([
    db.select().from(conversations).where(eq(conversations.taskId, taskId)),
    db.select().from(terminals).where(eq(terminals.taskId, taskId)),
  ]);

  const sessions: RemoteSessionMeta[] = [
    ...convRows.map((row) => {
      const sessionId = makePtySessionId(row.projectId, row.taskId, row.id);
      const dims = ptySessionRegistry.getDimensions(sessionId);
      return {
        sessionId,
        kind: 'conversation' as const,
        leafId: row.id,
        title: row.title,
        provider: row.provider ?? undefined,
        cols: dims?.cols,
        rows: dims?.rows,
      };
    }),
    ...terminalRows.map((row) => {
      const sessionId = makePtySessionId(row.projectId, row.taskId, row.id);
      const dims = ptySessionRegistry.getDimensions(sessionId);
      return {
        sessionId,
        kind: 'terminal' as const,
        leafId: row.id,
        title: row.name,
        cols: dims?.cols,
        rows: dims?.rows,
      };
    }),
  ];

  return {
    taskId: taskRow.id,
    taskName: taskRow.name,
    taskBranch: taskRow.taskBranch ?? undefined,
    sessions,
  };
}
