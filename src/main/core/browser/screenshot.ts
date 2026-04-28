import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, normalize, resolve } from 'node:path';
import type { Rectangle, WebContents } from 'electron';
import { log } from '@main/lib/logger';

const SCREENSHOT_DIR = resolve(join(tmpdir(), 'emdash-browser-annotations'));

export type CapturedScreenshot = {
  filePath: string;
  dataUrl: string;
};

export async function captureWebContentsRegion(
  webContents: WebContents,
  rect: Rectangle
): Promise<CapturedScreenshot> {
  const image = await webContents.capturePage(rect);
  const png = image.toPNG();
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  const filePath = join(SCREENSHOT_DIR, `${randomUUID()}.png`);
  await writeFile(filePath, png);
  return { filePath, dataUrl: image.toDataURL() };
}

export async function removeScreenshot(filePath: string): Promise<void> {
  const normalized = normalize(resolve(filePath));
  if (!normalized.startsWith(SCREENSHOT_DIR)) {
    log.warn('removeScreenshot rejected path outside screenshot dir:', filePath);
    return;
  }
  try {
    await rm(normalized, { force: true });
  } catch (error) {
    log.debug('removeScreenshot failed (non-fatal):', error);
  }
}

export async function clearScreenshotDir(): Promise<void> {
  try {
    await rm(SCREENSHOT_DIR, { recursive: true, force: true });
  } catch (error) {
    log.debug('clearScreenshotDir failed (non-fatal):', error);
  }
}
