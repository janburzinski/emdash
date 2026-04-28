import type { DiffMode, GitObjectRef, MergeBaseRange } from '@shared/git';
import { createRPCController } from '@shared/ipc/rpc';
import { err, ok } from '@shared/result';
import { TooManyFilesChangedError } from '@main/core/git/impl/status-parser';
import { resolveWorkspace } from '@main/core/projects/utils';
import { log } from '@main/lib/logger';
import { capture } from '@main/lib/telemetry';

export const gitController = createRPCController({
  getFullStatus: async (projectId: string, workspaceId: string) => {
    try {
      const env = resolveWorkspace(projectId, workspaceId);
      if (!env) return err({ type: 'not_found' as const });
      const data = await env.git.getFullStatus();
      return ok(data);
    } catch (e) {
      if (e instanceof TooManyFilesChangedError) {
        return err({ type: 'too_many_files' as const });
      }
      log.error('gitCtrl.getFullStatus failed', { projectId, workspaceId, error: e });
      return err({ type: 'git_error' as const, message: String(e) });
    }
  },

  getChangedFiles: async (
    projectId: string,
    workspaceId: string,
    base: DiffMode | GitObjectRef | MergeBaseRange
  ) => {
    try {
      const env = resolveWorkspace(projectId, workspaceId);
      if (!env) return err({ type: 'not_found' as const });
      const changes = await env.git.getChangedFiles(base);
      return ok({ changes });
    } catch (e) {
      log.error('gitCtrl.getChangedFiles failed', { projectId, workspaceId, base, error: e });
      return err({ type: 'git_error' as const, message: String(e) });
    }
  },

  getFileAtRef: async (projectId: string, workspaceId: string, filePath: string, ref: string) => {
    try {
      const env = resolveWorkspace(projectId, workspaceId);
      if (!env) return err({ type: 'not_found' as const });
      const content = await env.git.getFileAtRef(filePath, ref);
      return ok({ content });
    } catch (e) {
      log.error('gitCtrl.getFileAtRef failed', { projectId, workspaceId, filePath, ref, error: e });
      return err({ type: 'git_error' as const, message: String(e) });
    }
  },

  getFileAtIndex: async (projectId: string, workspaceId: string, filePath: string) => {
    try {
      const env = resolveWorkspace(projectId, workspaceId);
      if (!env) return err({ type: 'not_found' as const });
      const content = await env.git.getFileAtIndex(filePath);
      return ok({ content });
    } catch (e) {
      log.error('gitCtrl.getFileAtIndex failed', { projectId, workspaceId, filePath, error: e });
      return err({ type: 'git_error' as const, message: String(e) });
    }
  },

  stageFiles: async (projectId: string, workspaceId: string, filePaths: string[]) => {
    try {
      const env = resolveWorkspace(projectId, workspaceId);
      if (!env) return err({ type: 'not_found' as const });
      await env.git.stageFiles(filePaths);
      capture('vcs_files_staged', {
        count: filePaths.length,
        scope: filePaths.length === 1 ? 'single' : 'multiple',
        project_id: projectId,
        task_id: workspaceId,
      });
      return ok();
    } catch (e) {
      log.error('gitCtrl.stageFiles failed', { projectId, workspaceId, filePaths, error: e });
      return err({ type: 'git_error' as const, message: String(e) });
    }
  },

  stageAllFiles: async (projectId: string, workspaceId: string) => {
    try {
      const env = resolveWorkspace(projectId, workspaceId);
      if (!env) return err({ type: 'not_found' as const });
      const unstaged = await env.git.getUnstagedChanges();
      await env.git.stageAllFiles();
      capture('vcs_files_staged', {
        count: unstaged.changes.length,
        scope: 'all',
        project_id: projectId,
        task_id: workspaceId,
      });
      return ok();
    } catch (e) {
      log.error('gitCtrl.stageAllFiles failed', { projectId, workspaceId, error: e });
      return err({ type: 'git_error' as const, message: String(e) });
    }
  },

  unstageFiles: async (projectId: string, workspaceId: string, filePaths: string[]) => {
    try {
      const env = resolveWorkspace(projectId, workspaceId);
      if (!env) return err({ type: 'not_found' as const });
      await env.git.unstageFiles(filePaths);
      capture('vcs_files_unstaged', {
        count: filePaths.length,
        scope: filePaths.length === 1 ? 'single' : 'multiple',
        project_id: projectId,
        task_id: workspaceId,
      });
      return ok();
    } catch (e) {
      log.error('gitCtrl.unstageFiles failed', { projectId, workspaceId, filePaths, error: e });
      return err({ type: 'git_error' as const, message: String(e) });
    }
  },

  unstageAllFiles: async (projectId: string, workspaceId: string) => {
    try {
      const env = resolveWorkspace(projectId, workspaceId);
      if (!env) return err({ type: 'not_found' as const });
      const staged = await env.git.getStagedChanges();
      await env.git.unstageAllFiles();
      capture('vcs_files_unstaged', {
        count: staged.changes.length,
        scope: 'all',
        project_id: projectId,
        task_id: workspaceId,
      });
      return ok();
    } catch (e) {
      log.error('gitCtrl.unstageAllFiles failed', { projectId, workspaceId, error: e });
      return err({ type: 'git_error' as const, message: String(e) });
    }
  },

  revertFiles: async (projectId: string, workspaceId: string, filePaths: string[]) => {
    try {
      const env = resolveWorkspace(projectId, workspaceId);
      if (!env) return err({ type: 'not_found' as const });
      await env.git.revertFiles(filePaths);
      capture('vcs_files_discarded', {
        count: filePaths.length,
        scope: filePaths.length === 1 ? 'single' : 'multiple',
        project_id: projectId,
        task_id: workspaceId,
      });
      return ok();
    } catch (e) {
      log.error('gitCtrl.revertFiles failed', { projectId, workspaceId, filePaths, error: e });
      return err({ type: 'git_error' as const, message: String(e) });
    }
  },

  revertAllFiles: async (projectId: string, workspaceId: string) => {
    try {
      const env = resolveWorkspace(projectId, workspaceId);
      if (!env) return err({ type: 'not_found' as const });
      const status = await env.git.getStatus();
      const changedCount = new Set(status.changes.map((change) => change.path)).size;
      await env.git.revertAllFiles();
      capture('vcs_files_discarded', {
        count: changedCount,
        scope: 'all',
        project_id: projectId,
        task_id: workspaceId,
      });
      return ok();
    } catch (e) {
      log.error('gitCtrl.revertAllFiles failed', { projectId, workspaceId, error: e });
      return err({ type: 'git_error' as const, message: String(e) });
    }
  },

  commit: async (projectId: string, workspaceId: string, message: string) => {
    const env = resolveWorkspace(projectId, workspaceId);
    if (!env) return err({ type: 'not_found' as const });
    const result = await env.git.commit(message);
    if (!result.success) return err(result.error);
    return ok({ hash: result.data.hash });
  },

  push: async (projectId: string, workspaceId: string, remote: string) => {
    const env = resolveWorkspace(projectId, workspaceId);
    if (!env) return err({ type: 'not_found' as const });
    const result = await env.git.push(remote);
    capture('vcs_push', {
      success: result.success,
      project_id: projectId,
      task_id: workspaceId,
      ...(result.success ? {} : { error_type: result.error.type }),
    });
    if (!result.success) return err(result.error);
    return ok({ output: result.data.output });
  },

  publishBranch: async (
    projectId: string,
    workspaceId: string,
    branchName: string,
    remote: string
  ) => {
    const env = resolveWorkspace(projectId, workspaceId);
    if (!env) return err({ type: 'not_found' as const });
    const result = await env.git.publishBranch(branchName, remote);
    capture('vcs_branch_published', {
      success: result.success,
      project_id: projectId,
      task_id: workspaceId,
      ...(result.success ? {} : { error_type: result.error.type }),
    });
    if (!result.success) return err(result.error);
    return ok({ output: result.data.output });
  },

  pull: async (projectId: string, workspaceId: string) => {
    const env = resolveWorkspace(projectId, workspaceId);
    if (!env) return err({ type: 'not_found' as const });
    const result = await env.git.pull();
    capture('vcs_pull', {
      success: result.success,
      project_id: projectId,
      task_id: workspaceId,
      ...(result.success
        ? {}
        : {
            error_type: result.error.type,
            conflicts: result.error.type === 'conflict',
          }),
    });
    if (!result.success) return err(result.error);
    return ok({ output: result.data.output });
  },

  getLog: async (
    projectId: string,
    workspaceId: string,
    maxCount?: number,
    skip?: number,
    knownAheadCount?: number,
    remote?: string,
    base?: GitObjectRef,
    head?: GitObjectRef
  ) => {
    try {
      const env = resolveWorkspace(projectId, workspaceId);
      if (!env) return err({ type: 'not_found' as const });
      const result = await env.git.getLog({
        maxCount,
        skip,
        knownAheadCount,
        preferredRemote: remote,
        base,
        head,
      });
      return ok({ commits: result.commits, aheadCount: result.aheadCount });
    } catch (e) {
      log.error('gitCtrl.getLog failed', { projectId, workspaceId, error: e });
      return err({ type: 'git_error' as const, message: String(e) });
    }
  },
});
