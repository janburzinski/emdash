import { webContents as electronWebContents } from 'electron';
import { err, ok, type Result } from '@shared/result';
import { log } from '@main/lib/logger';
import { browserService } from './browser-service';
import { captureWebContentsRegion, type CapturedScreenshot } from './screenshot';

export type CaptureRegionParams = {
  webContentsId: number;
  rect: { x: number; y: number; width: number; height: number };
};

export type CaptureRegionError =
  | { type: 'unauthorized-web-contents' }
  | { type: 'web-contents-not-found' }
  | { type: 'capture-failed'; message: string };

export async function captureRegion(
  params: CaptureRegionParams
): Promise<Result<CapturedScreenshot, CaptureRegionError>> {
  if (!browserService.isAllowed(params.webContentsId)) {
    return err({ type: 'unauthorized-web-contents' as const });
  }
  const target = electronWebContents.fromId(params.webContentsId);
  if (!target) {
    return err({ type: 'web-contents-not-found' as const });
  }
  const rect = {
    x: Math.round(params.rect.x),
    y: Math.round(params.rect.y),
    width: Math.max(1, Math.round(params.rect.width)),
    height: Math.max(1, Math.round(params.rect.height)),
  };
  try {
    const captured = await captureWebContentsRegion(target, rect);
    return ok(captured);
  } catch (error) {
    log.error('captureRegion failed:', error);
    return err({
      type: 'capture-failed' as const,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
