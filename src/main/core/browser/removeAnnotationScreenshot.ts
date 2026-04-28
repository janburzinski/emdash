import { ok, type Result } from '@shared/result';
import { removeScreenshot } from './screenshot';

export async function removeAnnotationScreenshot(params: {
  filePath: string;
}): Promise<Result<null, never>> {
  await removeScreenshot(params.filePath);
  return ok(null);
}
