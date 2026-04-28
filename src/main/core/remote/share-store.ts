import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '@main/db/client';
import { remoteShares, type RemoteShareRow } from '@main/db/schema';

export class ShareStore {
  async insert(row: {
    id: string;
    taskId: string;
    tokenHash: string;
    label: string | null;
  }): Promise<RemoteShareRow> {
    const [inserted] = await db
      .insert(remoteShares)
      .values({
        id: row.id,
        taskId: row.taskId,
        tokenHash: row.tokenHash,
        label: row.label,
      })
      .returning();
    return inserted;
  }

  async listForTask(taskId: string): Promise<RemoteShareRow[]> {
    return db
      .select()
      .from(remoteShares)
      .where(and(eq(remoteShares.taskId, taskId), isNull(remoteShares.revokedAt)))
      .orderBy(asc(remoteShares.createdAt));
  }

  async listAllActive(): Promise<RemoteShareRow[]> {
    return db.select().from(remoteShares).where(isNull(remoteShares.revokedAt));
  }

  async findByTokenHash(tokenHash: string): Promise<RemoteShareRow | undefined> {
    const [row] = await db
      .select()
      .from(remoteShares)
      .where(and(eq(remoteShares.tokenHash, tokenHash), isNull(remoteShares.revokedAt)))
      .limit(1);
    return row;
  }

  async revoke(id: string): Promise<void> {
    await db
      .update(remoteShares)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(remoteShares.id, id));
  }
}

export const shareStore = new ShareStore();
