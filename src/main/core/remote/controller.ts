import os from 'node:os';
import { createRPCController } from '@shared/ipc/rpc';
import type { RemoteServerStatus, RemoteShareCreated, RemoteShareSummary } from '@shared/remote';
import { err, ok } from '@shared/result';
import { appSettingsService } from '@main/core/settings/settings-service';
import { defaultWebRoot, remoteServer } from './remote-server';
import { shareService } from './share-service';

/**
 * Pick the most useful base URL for share links.
 *  - 127.0.0.1 → leave as-is (local-only)
 *  - 0.0.0.0   → upgrade to first non-loopback LAN address (Tailscale, etc.)
 */
function resolveBaseUrl(bindAddress: string, port: number): string {
  if (bindAddress === '127.0.0.1' || bindAddress === 'localhost') {
    return `http://${bindAddress}:${port}`;
  }
  if (bindAddress === '0.0.0.0' || bindAddress === '::') {
    const ifaces = os.networkInterfaces();
    for (const list of Object.values(ifaces)) {
      for (const addr of list ?? []) {
        if (addr.family === 'IPv4' && !addr.internal) {
          return `http://${addr.address}:${port}`;
        }
      }
    }
    return `http://localhost:${port}`;
  }
  return `http://${bindAddress}:${port}`;
}

export const remoteController = createRPCController({
  /** Current server + settings status. */
  getStatus: async (): Promise<RemoteServerStatus> => {
    const settings = await appSettingsService.get('remote');
    const status = remoteServer.getStatus(settings.enabled);
    if (status.running) return status;
    return {
      ...status,
      bindAddress: settings.bindAddress,
      port: settings.port,
    };
  },

  createShareForTask: async (params: {
    taskId: string;
    label?: string;
  }): Promise<RemoteShareCreated> => {
    const settings = await appSettingsService.get('remote');
    const baseUrl = remoteServer.isRunning()
      ? resolveBaseUrl(settings.bindAddress, settings.port)
      : null;
    return shareService.createForTask({
      taskId: params.taskId,
      label: params.label,
      baseUrl,
    });
  },

  listSharesForTask: async (taskId: string): Promise<RemoteShareSummary[]> =>
    shareService.listForTask(taskId),

  revokeShare: async (id: string) => {
    await shareService.revoke(id);
    return ok();
  },

  /**
   * Start/stop the embedded server. Persisted via the `remote` setting and
   * applied immediately. Returns the resulting status.
   */
  setEnabled: async (enabled: boolean) => {
    const current = await appSettingsService.get('remote');
    await appSettingsService.update('remote', { ...current, enabled });
    if (enabled) {
      try {
        await remoteServer.start({
          bindAddress: current.bindAddress,
          port: current.port,
          webRoot: defaultWebRoot(),
        });
      } catch (e) {
        return err({ type: 'start_failed' as const, message: String((e as Error)?.message || e) });
      }
    } else {
      await remoteServer.stop();
    }
    return ok(remoteServer.getStatus(enabled));
  },
});
