import type { FileSystemProvider } from '@main/core/fs/types';
import type { ExecFn } from '@main/core/utils/exec';

// cloneRepository

export async function cloneRepository(
  repoUrl: string,
  localPath: string,
  exec: ExecFn
): Promise<{ success: boolean; error?: string }> {
  try {
    await exec('git', ['clone', repoUrl, localPath]);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Clone failed',
    };
  }
}

// initializeNewProject

export interface InitializeNewProjectParams {
  repoUrl: string;
  localPath: string;
  name: string;
  description?: string;
}

export async function initializeNewProject(
  params: InitializeNewProjectParams,
  exec: ExecFn,
  fs: FileSystemProvider
): Promise<void> {
  const { localPath, name, description } = params;

  const exists = await fs.exists('.');
  if (!exists) {
    throw new Error('Local path does not exist');
  }

  const readmeContent = description ? `# ${name}\n\n${description}\n` : `# ${name}\n`;
  await fs.write('README.md', readmeContent);

  const opts = { cwd: localPath };
  await exec('git', ['add', 'README.md'], opts);
  await exec('git', ['commit', '-m', 'Initial commit'], opts);

  try {
    await exec('git', ['push', '-u', 'origin', 'main'], opts);
  } catch {
    try {
      await exec('git', ['push', '-u', 'origin', 'master'], opts);
    } catch {
      throw new Error('Failed to push to remote repository');
    }
  }
}
