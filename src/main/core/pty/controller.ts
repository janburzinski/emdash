import { createRPCController } from '@shared/ipc/rpc';
import { err, ok } from '@shared/result';
import { log } from '@main/lib/logger';
import type { SshProjectProvider } from '../projects/impl/ssh-project-provider';
import { projectManager } from '../projects/project-manager';
import { ptySessionRegistry } from './pty-session-registry';

export const ptyController = createRPCController({
  sendInput: (sessionId: string, data: string) => {
    const pty = ptySessionRegistry.get(sessionId);
    if (!pty) return err({ type: 'not_found' as const });
    pty.write(data);
    return ok();
  },

  resize: (sessionId: string, cols: number, rows: number) => {
    const pty = ptySessionRegistry.get(sessionId);
    if (!pty) return err({ type: 'not_found' as const });
    pty.resize(cols, rows);
    return ok();
  },

  subscribe: (sessionId: string) => {
    return ok({ buffer: ptySessionRegistry.subscribe(sessionId) });
  },

  unsubscribe: (sessionId: string) => {
    ptySessionRegistry.unsubscribe(sessionId);
    return ok();
  },

  uploadFiles: async (args: { sessionId: string; localPaths: string[] }) => {
    try {
      const [projectId, scopeId] = args.sessionId.split(':');
      if (!projectId || !scopeId) {
        return err({ type: 'invalid_session' as const });
      }

      const provider = projectManager.getProject(projectId);
      if (!provider || provider.type !== 'ssh') {
        return err({ type: 'not_ssh' as const });
      }

      const remotePaths = await (provider as SshProjectProvider).uploadFiles(
        scopeId,
        args.localPaths
      );
      return ok({ remotePaths });
    } catch (e: unknown) {
      log.error('pty:uploadFiles failed', {
        sessionId: args.sessionId,
        error: (e as Error)?.message || e,
      });
      return err({ type: 'upload_failed' as const, message: String((e as Error)?.message || e) });
    }
  },
});
