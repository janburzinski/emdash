import type { ExecFn } from '@main/core/utils/exec';

export async function resolveRemoteHome(exec: ExecFn): Promise<string> {
  const { stdout } = await exec('sh', ['-c', 'printf %s "$HOME"']);
  const home = stdout.trim();
  if (!home) {
    throw new Error('Remote home directory is empty');
  }
  return home;
}
