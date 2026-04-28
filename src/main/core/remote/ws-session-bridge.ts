import type { WebSocket } from 'ws';
import { ptyDataChannel, ptyExitChannel, ptyResizeChannel } from '@shared/events/ptyEvents';
import {
  type RemoteClientMessage,
  type RemoteServerMessage,
  type RemoteSessionMeta,
} from '@shared/remote';
import { ptySessionRegistry } from '@main/core/pty/pty-session-registry';
import { events } from '@main/lib/events';
import { log } from '@main/lib/logger';

/**
 * Bridges a single WebSocket client to one or more PTY sessions belonging to
 * the share's task. Enforces that sessionIds are scoped to the allowed set
 * — clients cannot subscribe to arbitrary sessions.
 */
export class WsSessionBridge {
  private subscriptions = new Map<string, () => void>();
  private allowed = new Set<string>();

  constructor(
    private readonly ws: WebSocket,
    initialAllowed: RemoteSessionMeta[]
  ) {
    this.setAllowedSessions(initialAllowed);
  }

  setAllowedSessions(sessions: RemoteSessionMeta[]): void {
    const next = new Set(sessions.map((s) => s.sessionId));
    // Drop subscriptions to sessions that no longer exist.
    for (const sessionId of this.subscriptions.keys()) {
      if (!next.has(sessionId)) {
        this.unsubscribeSession(sessionId);
      }
    }
    this.allowed = next;
  }

  send(message: RemoteServerMessage): void {
    if (this.ws.readyState !== this.ws.OPEN) return;
    try {
      this.ws.send(JSON.stringify(message));
    } catch (e) {
      log.warn('WsSessionBridge: send failed', { error: String(e) });
    }
  }

  handleMessage(raw: string): void {
    let msg: RemoteClientMessage;
    try {
      msg = JSON.parse(raw) as RemoteClientMessage;
    } catch {
      this.send({ type: 'error', reason: 'invalid_json' });
      return;
    }

    switch (msg.type) {
      case 'ping':
        this.send({ type: 'pong' });
        return;
      case 'subscribe':
        this.subscribeSession(msg.sessionId);
        return;
      case 'unsubscribe':
        this.unsubscribeSession(msg.sessionId);
        return;
      case 'input':
        if (!this.allowed.has(msg.sessionId)) {
          this.send({ type: 'error', reason: 'session_not_allowed' });
          return;
        }
        ptySessionRegistry.get(msg.sessionId)?.write(msg.data);
        return;
      case 'resize':
        // Web clients are observers — they mirror the local Emdash app's PTY
        // size but never resize the PTY themselves. Resizing here would fight
        // the local renderer for control of a shared kernel resource and
        // corrupt the display in both surfaces.
        return;
      default: {
        const unknown: never = msg;
        log.warn('WsSessionBridge: unknown message', { msg: unknown });
      }
    }
  }

  private subscribeSession(sessionId: string): void {
    if (!this.allowed.has(sessionId)) {
      this.send({ type: 'error', reason: 'session_not_allowed' });
      return;
    }
    if (this.subscriptions.has(sessionId)) return;

    const snapshot = ptySessionRegistry.subscribe(sessionId);
    this.send({ type: 'snapshot', sessionId, data: snapshot });

    // Push the current PTY size so the web client can size its xterm to match
    // before any further resize events arrive.
    const dims = ptySessionRegistry.getDimensions(sessionId);
    if (dims) {
      this.send({ type: 'resize', sessionId, cols: dims.cols, rows: dims.rows });
    }

    const offData = events.on(
      ptyDataChannel,
      (data) => {
        this.send({ type: 'data', sessionId, data });
      },
      sessionId
    );

    const offExit = events.on(
      ptyExitChannel,
      (info) => {
        this.send({ type: 'exit', sessionId, exitCode: info.exitCode, signal: info.signal });
      },
      sessionId
    );

    const offResize = events.on(
      ptyResizeChannel,
      ({ cols, rows }) => {
        this.send({ type: 'resize', sessionId, cols, rows });
      },
      sessionId
    );

    this.subscriptions.set(sessionId, () => {
      offData();
      offExit();
      offResize();
    });
  }

  private unsubscribeSession(sessionId: string): void {
    const off = this.subscriptions.get(sessionId);
    if (!off) return;
    off();
    this.subscriptions.delete(sessionId);
  }

  dispose(): void {
    for (const off of this.subscriptions.values()) {
      try {
        off();
      } catch {}
    }
    this.subscriptions.clear();
    this.allowed.clear();
  }
}
