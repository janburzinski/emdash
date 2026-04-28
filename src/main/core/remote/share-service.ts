import { randomUUID } from 'node:crypto';
import type { RemoteShareCreated, RemoteShareSummary } from '@shared/remote';
import type { RemoteShareRow } from '@main/db/schema';
import { generateShareToken, hashShareToken, safeEqual } from './auth';
import { shareStore, type ShareStore } from './share-store';

function rowToSummary(row: RemoteShareRow): RemoteShareSummary {
  return {
    id: row.id,
    taskId: row.taskId,
    label: row.label,
    createdAt: row.createdAt,
    tokenSuffix: row.tokenHash.slice(-4),
  };
}

export class ShareService {
  constructor(private readonly store: ShareStore = shareStore) {}

  async createForTask(params: {
    taskId: string;
    label?: string;
    baseUrl: string | null;
  }): Promise<RemoteShareCreated> {
    const id = randomUUID();
    const token = generateShareToken();
    const tokenHash = hashShareToken(token);
    const row = await this.store.insert({
      id,
      taskId: params.taskId,
      tokenHash,
      label: params.label ?? null,
    });
    const summary = rowToSummary(row);
    return {
      ...summary,
      token,
      url: params.baseUrl ? `${params.baseUrl}/s/${token}` : `/s/${token}`,
    };
  }

  async listForTask(taskId: string): Promise<RemoteShareSummary[]> {
    const rows = await this.store.listForTask(taskId);
    return rows.map(rowToSummary);
  }

  async revoke(id: string): Promise<void> {
    await this.store.revoke(id);
  }

  /**
   * Verify a token and return the matching share row, or undefined if invalid.
   * Performs a constant-time hash comparison.
   */
  async verifyToken(token: string): Promise<RemoteShareRow | undefined> {
    if (!token || token.length < 16) return undefined;
    const expectedHash = hashShareToken(token);
    const row = await this.store.findByTokenHash(expectedHash);
    if (!row) return undefined;
    if (!safeEqual(expectedHash, row.tokenHash)) return undefined;
    return row;
  }
}

export const shareService = new ShareService();
