import type { LocalBranchesPayload, RemoteBranchesPayload } from '@shared/git';
import { createRPCController } from '@shared/ipc/rpc';
import { err, ok } from '@shared/result';
import { capture } from '@main/lib/telemetry';
import { projectManager } from '../projects/project-manager';

export const repositoryController = createRPCController({
  getLocalBranches: async (projectId: string): Promise<LocalBranchesPayload> => {
    const project = projectManager.getProject(projectId);
    if (!project) throw new Error('Project not found');
    return project.repository.getLocalBranchesPayload();
  },

  getRemoteBranches: async (projectId: string): Promise<RemoteBranchesPayload> => {
    const project = projectManager.getProject(projectId);
    if (!project) throw new Error('Project not found');
    return project.repository.getRemoteBranchesPayload();
  },

  addRemote: async (projectId: string, name: string, url: string) => {
    const project = projectManager.getProject(projectId);
    if (!project) return err({ type: 'not_found' as const });
    try {
      await project.repository.addRemote(name, url);
      return ok();
    } catch (e) {
      return err({ type: 'git_error' as const, message: String(e) });
    }
  },

  fetch: async (projectId: string) => {
    const project = projectManager.getProject(projectId);
    if (!project) return err({ type: 'not_found' as const });
    const result = await project.fetch();
    capture('vcs_fetch', {
      success: result.success,
      project_id: projectId,
      ...(result.success ? {} : { error_type: result.error.type }),
    });
    if (!result.success) return err(result.error);
    return ok();
  },

  fetchPrForReview: async (
    projectId: string,
    prNumber: number,
    headRefName: string,
    headRepositoryUrl: string,
    isFork: boolean
  ) => {
    const project = projectManager.getProject(projectId);
    if (!project) return err({ type: 'not_found' as const });
    const result = await project.repository.fetchPrForReview(
      prNumber,
      headRefName,
      headRepositoryUrl,
      headRefName,
      isFork
    );
    if (!result.success) return err(result.error);
    return ok({ localBranch: headRefName });
  },
});
