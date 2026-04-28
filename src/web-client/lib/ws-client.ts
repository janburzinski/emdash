import type { RemoteClientMessage, RemoteServerMessage } from '@shared/remote';

export type WsConnectionState = 'connecting' | 'open' | 'closed' | 'error';

/**
 * Lightweight typed WebSocket wrapper for the remote share endpoint.
 * Reconnects automatically with capped backoff while the page is open.
 */
export class RemoteWsClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<(msg: RemoteServerMessage) => void>();
  private stateListeners = new Set<(s: WsConnectionState) => void>();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private state: WsConnectionState = 'connecting';
  private disposed = false;

  constructor(private readonly token: string) {}

  connect(): void {
    if (this.disposed) return;
    this.setState('connecting');
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${location.host}/api/ws?token=${encodeURIComponent(this.token)}`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      console.error('WS construction failed', e);
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setState('open');
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as RemoteServerMessage;
        for (const cb of this.listeners) cb(msg);
      } catch {
        /* ignore */
      }
    };
    ws.onerror = () => {
      this.setState('error');
    };
    ws.onclose = () => {
      this.ws = null;
      if (this.disposed) return;
      this.setState('closed');
      this.scheduleReconnect();
    };
  }

  send(msg: RemoteClientMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(msg));
  }

  on(cb: (msg: RemoteServerMessage) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  onState(cb: (s: WsConnectionState) => void): () => void {
    this.stateListeners.add(cb);
    cb(this.state);
    return () => this.stateListeners.delete(cb);
  }

  dispose(): void {
    this.disposed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    try {
      this.ws?.close();
    } catch {}
    this.ws = null;
    this.listeners.clear();
    this.stateListeners.clear();
  }

  private setState(s: WsConnectionState): void {
    if (this.state === s) return;
    this.state = s;
    for (const cb of this.stateListeners) cb(s);
  }

  private scheduleReconnect(): void {
    if (this.disposed) return;
    if (this.reconnectTimer) return;
    const attempt = ++this.reconnectAttempts;
    const delay = Math.min(15000, 500 * 2 ** Math.min(attempt - 1, 5));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}
