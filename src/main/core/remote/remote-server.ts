import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { app } from 'electron';
import { WebSocketServer, type WebSocket } from 'ws';
import type { RemoteServerStatus, RemoteShareInfo } from '@shared/remote';
import type { RemoteShareRow } from '@main/db/schema';
import { log } from '@main/lib/logger';
import { resolveShareInfo } from './share-resolver';
import { shareService } from './share-service';
import { WsSessionBridge } from './ws-session-bridge';

const MAX_BODY_BYTES = 1_000_000;

export interface RemoteServerOptions {
  bindAddress: string;
  port: number;
  /** Static asset directory holding the built web client. */
  webRoot: string;
}

/**
 * Embedded HTTP + WebSocket server that exposes shared tasks to remote
 * browsers. The server is single-tenant per Electron app instance and
 * never starts unless explicitly enabled via settings.
 *
 * Auth is purely token-based: callers must supply a per-share token in the
 * URL path (`/s/<token>`) or as the `token` query param for `/api/*` and
 * the WebSocket endpoint. Tokens are matched against `remote_shares` and
 * compared in constant time inside `shareService.verifyToken`.
 */
export class RemoteServer {
  private server: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private opts: RemoteServerOptions | null = null;
  private bridges = new Set<WsSessionBridge>();

  isRunning(): boolean {
    return this.server !== null;
  }

  async start(opts: RemoteServerOptions): Promise<void> {
    if (this.server) await this.stop();
    this.opts = opts;

    this.wss = new WebSocketServer({ noServer: true });

    this.server = http.createServer((req, res) => {
      this.handleHttp(req, res).catch((e) => {
        log.error('RemoteServer: http handler error', { error: String(e) });
        try {
          res.statusCode = 500;
          res.end('internal_error');
        } catch {}
      });
    });

    this.server.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (url.pathname !== '/api/ws') {
        socket.destroy();
        return;
      }
      const token = url.searchParams.get('token') ?? '';
      shareService
        .verifyToken(token)
        .then(async (share) => {
          if (!share) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
          }
          const info = await resolveShareInfo(share.taskId);
          if (!info) {
            socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
            socket.destroy();
            return;
          }
          this.wss!.handleUpgrade(req, socket, head, (ws) => {
            this.attachWebsocket(ws, share, info);
          });
        })
        .catch((e) => {
          log.error('RemoteServer: ws upgrade error', { error: String(e) });
          try {
            socket.destroy();
          } catch {}
        });
    });

    return new Promise<void>((resolve, reject) => {
      const onError = (err: Error) => {
        log.error('RemoteServer: failed to listen', { error: String(err) });
        reject(err);
      };
      this.server!.once('error', onError);
      this.server!.listen(opts.port, opts.bindAddress, () => {
        this.server!.off('error', onError);
        log.info('RemoteServer: listening', {
          bindAddress: opts.bindAddress,
          port: opts.port,
        });
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    for (const bridge of this.bridges) {
      try {
        bridge.dispose();
      } catch {}
    }
    this.bridges.clear();
    if (this.wss) {
      try {
        this.wss.close();
      } catch {}
      this.wss = null;
    }
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
      this.server = null;
    }
    this.opts = null;
  }

  getStatus(enabled: boolean): RemoteServerStatus {
    const opts = this.opts;
    const running = this.isRunning();
    return {
      enabled,
      running,
      bindAddress: opts?.bindAddress ?? '127.0.0.1',
      port: opts?.port ?? 0,
      baseUrl: running && opts ? this.formatBaseUrl(opts) : null,
    };
  }

  private formatBaseUrl(opts: RemoteServerOptions): string {
    const host = opts.bindAddress === '0.0.0.0' ? 'localhost' : opts.bindAddress;
    return `http://${host}:${opts.port}`;
  }

  private attachWebsocket(ws: WebSocket, share: RemoteShareRow, info: RemoteShareInfo): void {
    const bridge = new WsSessionBridge(ws, info.sessions);
    this.bridges.add(bridge);

    bridge.send({ type: 'hello', share: info });

    ws.on('message', (data) => {
      const text = typeof data === 'string' ? data : data.toString('utf8');
      bridge.handleMessage(text);
    });

    ws.on('close', () => {
      bridge.dispose();
      this.bridges.delete(bridge);
    });

    ws.on('error', (err) => {
      log.warn('RemoteServer: ws error', { shareId: share.id, error: String(err) });
    });

    // Refresh allowed sessions every 5s so newly-created conversations and
    // terminals become reachable without reconnecting.
    const refresh = setInterval(async () => {
      try {
        const fresh = await resolveShareInfo(share.taskId);
        if (!fresh) return;
        bridge.setAllowedSessions(fresh.sessions);
        bridge.send({ type: 'sessions', sessions: fresh.sessions });
      } catch (e) {
        log.warn('RemoteServer: refresh failed', { error: String(e) });
      }
    }, 5000);
    ws.once('close', () => clearInterval(refresh));
  }

  private async handleHttp(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      res.end('method_not_allowed');
      return;
    }
    const url = new URL(req.url ?? '/', 'http://localhost');
    const pathname = url.pathname;

    // Hard limit on request body — we never read GET bodies but be defensive.
    let received = 0;
    req.on('data', (chunk: Buffer) => {
      received += chunk.length;
      if (received > MAX_BODY_BYTES) {
        try {
          req.destroy();
        } catch {}
      }
    });

    if (pathname === '/api/share') {
      const token = url.searchParams.get('token') ?? '';
      const share = await shareService.verifyToken(token);
      if (!share) return this.respond(res, 401, { error: 'unauthorized' });
      const info = await resolveShareInfo(share.taskId);
      if (!info) return this.respond(res, 404, { error: 'not_found' });
      return this.respond(res, 200, info);
    }

    if (pathname === '/healthz') {
      return this.respond(res, 200, { ok: true });
    }

    if (pathname === '/' || pathname === '') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('emdash remote — open your share link');
      return;
    }

    if (pathname.startsWith('/s/')) {
      return this.serveSpa(res);
    }

    if (pathname.startsWith('/assets/') || pathname === '/favicon.ico') {
      return this.serveStatic(pathname, res);
    }

    res.statusCode = 404;
    res.end('not_found');
  }

  private respond(res: http.ServerResponse, status: number, body: unknown): void {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(body));
  }

  private serveSpa(res: http.ServerResponse): void {
    const indexPath = path.join(this.opts!.webRoot, 'index.html');
    if (!existsSync(indexPath)) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(
        'Remote web client not built yet. Run `pnpm run build:web-client` (or rebuild the app).'
      );
      return;
    }
    let html: string;
    try {
      html = readFileSync(indexPath, 'utf8');
    } catch (e) {
      res.statusCode = 500;
      res.end(`failed_to_read_index: ${String(e)}`);
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; connect-src 'self' ws: wss:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; script-src 'self'; frame-ancestors 'none'"
    );
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    res.end(html);
  }

  private serveStatic(pathname: string, res: http.ServerResponse): void {
    const webRoot = this.opts!.webRoot;
    // Resolve and ensure we never escape webRoot.
    const safe = path.normalize(pathname).replace(/^[/\\]+/, '');
    const abs = path.join(webRoot, safe);
    if (!abs.startsWith(webRoot + path.sep) && abs !== webRoot) {
      res.statusCode = 400;
      res.end('bad_path');
      return;
    }
    if (!existsSync(abs)) {
      res.statusCode = 404;
      res.end('not_found');
      return;
    }
    let stat;
    try {
      stat = statSync(abs);
    } catch {
      res.statusCode = 404;
      res.end('not_found');
      return;
    }
    if (!stat.isFile()) {
      res.statusCode = 404;
      res.end('not_found');
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', mimeFor(abs));
    res.setHeader('Content-Length', String(stat.size));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    createReadStream(abs).pipe(res);
  }
}

function mimeFor(file: string): string {
  const ext = path.extname(file).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
    case '.mjs':
      return 'application/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.ico':
      return 'image/x-icon';
    case '.woff':
      return 'font/woff';
    case '.woff2':
      return 'font/woff2';
    case '.map':
      return 'application/json; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Default location of the built web client. In dev this is the project's
 * `out/web-client/` directory; in production the same path resolves inside
 * `app.asar` (Electron transparently reads static files from there).
 */
export function defaultWebRoot(): string {
  return path.join(app.getAppPath(), 'out', 'web-client');
}

export const remoteServer = new RemoteServer();
