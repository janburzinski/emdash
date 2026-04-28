import { createRPCController } from '@shared/ipc/rpc';
import { captureRegion } from './captureRegion';
import { removeAnnotationScreenshot } from './removeAnnotationScreenshot';

export const browserController = createRPCController({
  captureRegion,
  removeAnnotationScreenshot,
});
