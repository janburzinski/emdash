import { app } from 'electron';
import { getMainWindow } from '@main/app/window';
import { log } from '@main/lib/logger';
import { clearScreenshotDir } from './screenshot';

export const BROWSER_PARTITION = 'persist:emdash-browser';

class BrowserService {
  private readonly allowedWebContentsIds = new Set<number>();
  private initialized = false;

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    app.on('web-contents-created', (_event, webContents) => {
      if (webContents.getType() !== 'webview') return;
      const host = webContents.hostWebContents;
      const main = getMainWindow();
      if (!host || !main || host.id !== main.webContents.id) return;

      const id = webContents.id;
      this.allowedWebContentsIds.add(id);

      // Lock down dangerous capabilities for the embedded browser surface.
      webContents.session.setPermissionRequestHandler((_wc, _permission, callback) =>
        callback(false)
      );
      webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

      webContents.once('destroyed', () => {
        this.allowedWebContentsIds.delete(id);
      });
    });

    app.on('before-quit', () => {
      clearScreenshotDir().catch((e) => log.debug('browser cleanup failed:', e));
    });
  }

  isAllowed(webContentsId: number): boolean {
    return this.allowedWebContentsIds.has(webContentsId);
  }
}

export const browserService = new BrowserService();
