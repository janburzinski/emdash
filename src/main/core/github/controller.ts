import * as path from 'node:path';
import type {
  GitHubAuthResponse,
  GitHubConnectResponse,
  GitHubStatusResponse,
} from '@shared/github';
import { createRPCController } from '@shared/ipc/rpc';
import { ACCOUNT_CONFIG } from '@main/core/account/config';
import { LocalFileSystem } from '@main/core/fs/impl/local-fs';
import { SshFileSystem } from '@main/core/fs/impl/ssh-fs';
import type { FileSystemProvider } from '@main/core/fs/types';
import { cloneRepository, initializeNewProject } from '@main/core/git/impl/git-repo-utils';
import { githubConnectionService } from '@main/core/github/services/github-connection-service';
import { repoService } from '@main/core/github/services/repo-service';
import { sshConnectionManager } from '@main/core/ssh/ssh-connection-manager';
import { getGitLocalExec, getGitSshExec, type ExecFn } from '@main/core/utils/exec';
import { log } from '@main/lib/logger';
import { capture, identify as telemetryIdentify } from '@main/lib/telemetry';

export const githubController = createRPCController({
  getStatus: async (): Promise<GitHubStatusResponse> => {
    try {
      return await githubConnectionService.getStatus();
    } catch (error) {
      log.error('GitHub status check failed:', error);
      return { authenticated: false, user: null, tokenSource: null };
    }
  },

  auth: async (): Promise<GitHubAuthResponse> => {
    try {
      const result = await githubConnectionService.startDeviceFlowAuth();
      if (result.success) {
        capture('integration_connected', { provider: 'github' });
        const user = await githubConnectionService.getCurrentUser();
        if (user?.login) {
          telemetryIdentify(user.login);
        }
      }
      return result;
    } catch (error) {
      log.error('GitHub authentication failed:', error);
      return { success: false, error: 'Authentication failed' };
    }
  },

  connectOAuth: async (): Promise<GitHubConnectResponse> => {
    try {
      const { baseUrl } = ACCOUNT_CONFIG.authServer;
      const result = await githubConnectionService.startOAuthFlow(baseUrl);
      if (result.success) {
        capture('integration_connected', { provider: 'github' });
        if (result.user?.login) {
          telemetryIdentify(result.user.login);
        } else {
          const user = await githubConnectionService.getCurrentUser();
          if (user?.login) {
            telemetryIdentify(user.login);
          }
        }
      }
      return result;
    } catch (error) {
      log.error('GitHub OAuth connect failed:', error);
      return { success: false, error: 'OAuth connection failed' };
    }
  },

  authCancel: async () => {
    try {
      githubConnectionService.cancelAuth();
      return { success: true };
    } catch (error) {
      log.error('Failed to cancel GitHub auth:', error);
      return { success: false, error: 'Failed to cancel' };
    }
  },

  logout: async () => {
    try {
      await githubConnectionService.logout();
      capture('integration_disconnected', { provider: 'github' });
      return { success: true };
    } catch (error) {
      log.error('GitHub logout failed:', error);
      return { success: false, error: 'Logout failed' };
    }
  },

  getOwners: async () => {
    try {
      const owners = await repoService.getOwners();
      return { success: true, owners };
    } catch (error) {
      log.error('Failed to get owners:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get owners',
      };
    }
  },

  createRepository: async (params: {
    name: string;
    owner: string;
    description?: string;
    isPrivate?: boolean;
    visibility?: 'public' | 'private';
  }) => {
    try {
      const isPrivate = params.isPrivate ?? params.visibility === 'private';
      const repoInfo = await repoService.createRepository({
        name: params.name,
        owner: params.owner,
        description: params.description,
        isPrivate,
      });
      return {
        success: true,
        repoUrl: repoInfo.url,
        nameWithOwner: repoInfo.nameWithOwner,
        defaultBranch: repoInfo.defaultBranch,
      };
    } catch (error) {
      log.error('Failed to create repository:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create repository',
      };
    }
  },

  cloneRepository: async (repoUrl: string, targetPath: string, connectionId?: string) => {
    try {
      let exec: ExecFn;
      let parentFs: FileSystemProvider;

      if (connectionId) {
        const proxy = await sshConnectionManager.connect(connectionId);
        exec = getGitSshExec(proxy, () => githubConnectionService.getToken());
        parentFs = new SshFileSystem(proxy, path.posix.dirname(targetPath));
      } else {
        exec = getGitLocalExec(() => githubConnectionService.getToken());
        parentFs = new LocalFileSystem(path.dirname(targetPath));
      }

      await parentFs.mkdir('.', { recursive: true });
      return await cloneRepository(repoUrl, targetPath, exec);
    } catch (error) {
      log.error('Failed to clone repository:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Clone failed',
      };
    }
  },

  initializeProject: async (params: {
    targetPath: string;
    name: string;
    description?: string;
    connectionId?: string;
  }) => {
    try {
      let exec: ExecFn;
      let projectFs: FileSystemProvider;

      if (params.connectionId) {
        const proxy = await sshConnectionManager.connect(params.connectionId);
        exec = getGitSshExec(proxy, () => githubConnectionService.getToken());
        projectFs = new SshFileSystem(proxy, params.targetPath);
      } else {
        exec = getGitLocalExec(() => githubConnectionService.getToken());
        projectFs = new LocalFileSystem(params.targetPath);
      }

      await initializeNewProject(
        {
          repoUrl: '',
          localPath: params.targetPath,
          name: params.name,
          description: params.description,
        },
        exec,
        projectFs
      );

      return { success: true };
    } catch (error) {
      log.error('Failed to initialize project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Initialize failed',
      };
    }
  },
});
