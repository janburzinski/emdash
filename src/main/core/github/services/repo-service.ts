import type { Octokit } from '@octokit/rest';
import { getOctokit } from './octokit-provider';

export interface GitHubOwner {
  login: string;
  type: 'User' | 'Organization';
}

export interface GitHubRepositoryService {
  getOwners(): Promise<GitHubOwner[]>;
  createRepository(params: {
    name: string;
    description?: string;
    owner: string;
    isPrivate: boolean;
  }): Promise<{ url: string; defaultBranch: string; nameWithOwner: string }>;
}

export class GitHubRepositoryServiceImpl implements GitHubRepositoryService {
  constructor(private readonly getOctokit: () => Promise<Octokit>) {}

  async getOwners(): Promise<GitHubOwner[]> {
    const octokit = await this.getOctokit();
    const { data: user } = await octokit.rest.users.getAuthenticated();
    const owners: GitHubOwner[] = [{ login: user.login, type: 'User' }];

    try {
      const { data: orgs } = await octokit.rest.orgs.listForAuthenticatedUser();
      for (const org of orgs) {
        owners.push({ login: org.login, type: 'Organization' });
      }
    } catch {}

    return owners;
  }

  async createRepository(params: {
    name: string;
    description?: string;
    owner: string;
    isPrivate: boolean;
  }): Promise<{ url: string; defaultBranch: string; nameWithOwner: string }> {
    const octokit = await this.getOctokit();
    const { data: user } = await octokit.rest.users.getAuthenticated();
    const isCurrentUser = params.owner === user.login;

    const createParams = {
      name: params.name,
      description: params.description,
      private: params.isPrivate,
    };

    const { data } = isCurrentUser
      ? await octokit.rest.repos.createForAuthenticatedUser(createParams)
      : await octokit.rest.repos.createInOrg({ ...createParams, org: params.owner });

    return {
      url: data.html_url,
      defaultBranch: data.default_branch || 'main',
      nameWithOwner: data.full_name,
    };
  }
}

export const repoService = new GitHubRepositoryServiceImpl(getOctokit);
