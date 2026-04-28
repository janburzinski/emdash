import type { Octokit } from '@octokit/rest';
import { describe, expect, it, vi } from 'vitest';
import { getOctokit } from './octokit-provider';
import { repoService } from './repo-service';

vi.mock('./octokit-provider', () => ({
  getOctokit: vi.fn(),
}));

const mockGetOctokit = vi.mocked(getOctokit);

function makeOctokit(
  overrides: Partial<{
    usersGetAuthenticated: ReturnType<typeof vi.fn>;
    orgsListForAuthenticatedUser: ReturnType<typeof vi.fn>;
    reposCreateForAuthenticatedUser: ReturnType<typeof vi.fn>;
    reposCreateInOrg: ReturnType<typeof vi.fn>;
  }> = {}
): Octokit {
  return {
    rest: {
      repos: {
        createForAuthenticatedUser: overrides.reposCreateForAuthenticatedUser ?? vi.fn(),
        createInOrg: overrides.reposCreateInOrg ?? vi.fn(),
      },
      users: {
        getAuthenticated:
          overrides.usersGetAuthenticated ??
          vi.fn().mockResolvedValue({ data: { login: 'testuser' } }),
      },
      orgs: {
        listForAuthenticatedUser:
          overrides.orgsListForAuthenticatedUser ?? vi.fn().mockResolvedValue({ data: [] }),
      },
    },
  } as unknown as Octokit;
}

describe('GitHubRepositoryServiceImpl', () => {
  describe('getOwners', () => {
    it('returns user + orgs', async () => {
      const octokit = makeOctokit({
        orgsListForAuthenticatedUser: vi.fn().mockResolvedValue({ data: [{ login: 'acme' }] }),
      });
      mockGetOctokit.mockResolvedValue(octokit);

      const owners = await repoService.getOwners();

      expect(owners).toEqual([
        { login: 'testuser', type: 'User' },
        { login: 'acme', type: 'Organization' },
      ]);
    });

    it('returns user only if orgs fail', async () => {
      const octokit = makeOctokit({
        orgsListForAuthenticatedUser: vi.fn().mockRejectedValue(new Error('forbidden')),
      });
      mockGetOctokit.mockResolvedValue(octokit);

      const owners = await repoService.getOwners();

      expect(owners).toEqual([{ login: 'testuser', type: 'User' }]);
    });
  });

  describe('createRepository', () => {
    it('creates for authenticated user', async () => {
      const octokit = makeOctokit({
        reposCreateForAuthenticatedUser: vi.fn().mockResolvedValue({
          data: {
            html_url: 'https://github.com/testuser/new',
            default_branch: 'main',
            full_name: 'testuser/new',
          },
        }),
      });
      mockGetOctokit.mockResolvedValue(octokit);

      const result = await repoService.createRepository({
        name: 'new',
        owner: 'testuser',
        isPrivate: false,
      });

      expect(result).toEqual({
        url: 'https://github.com/testuser/new',
        defaultBranch: 'main',
        nameWithOwner: 'testuser/new',
      });
    });

    it('creates in org for non-user owner', async () => {
      const octokit = makeOctokit({
        reposCreateInOrg: vi.fn().mockResolvedValue({
          data: {
            html_url: 'https://github.com/acme/new',
            default_branch: 'main',
            full_name: 'acme/new',
          },
        }),
      });
      mockGetOctokit.mockResolvedValue(octokit);

      await repoService.createRepository({ name: 'new', owner: 'acme', isPrivate: true });

      expect(octokit.rest.repos.createInOrg).toHaveBeenCalledWith(
        expect.objectContaining({ org: 'acme', name: 'new', private: true })
      );
    });
  });
});
