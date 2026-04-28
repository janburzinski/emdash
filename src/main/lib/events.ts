import { EventEmitter } from 'node:events';
import { ipcMain } from 'electron';
import { createEventEmitter, type EmitterAdapter } from '@shared/ipc/events';
import { getMainWindow } from '@main/app/window';

function createMainAdapter(): EmitterAdapter {
  // In-process pub/sub for main-side consumers (e.g. the remote-share WS
  // bridge subscribing to ptyDataChannel). Without this, `emit` would only
  // hit the renderer via IPC and never fan out to other main-process
  // listeners on the same channel.
  const local = new EventEmitter();
  local.setMaxListeners(0);

  return {
    emit: (eventName: string, data: unknown, topic?: string) => {
      const channel = topic ? `${eventName}.${topic}` : eventName;
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send(channel, data);
      }
      local.emit(channel, data);
    },
    on: (eventName: string, cb: (data: unknown) => void, topic?: string) => {
      const channel = topic ? `${eventName}.${topic}` : eventName;
      const ipcHandler = (_e: Electron.IpcMainEvent, data: unknown) => cb(data);
      const localHandler = (data: unknown) => cb(data);
      ipcMain.on(channel, ipcHandler);
      local.on(channel, localHandler);
      return () => {
        ipcMain.removeListener(channel, ipcHandler);
        local.removeListener(channel, localHandler);
      };
    },
  };
}

export const events = createEventEmitter(createMainAdapter());
