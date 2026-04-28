import { WebLinksAddon } from '@xterm/addon-web-links';
import { Terminal } from '@xterm/xterm';
import { useEffect, useRef } from 'react';
import type { RemoteServerMessage, RemoteSessionMeta } from '@shared/remote';
import type { RemoteWsClient } from '../lib/ws-client';

interface Props {
  ws: RemoteWsClient;
  session: RemoteSessionMeta;
  active: boolean;
}

const SCROLLBACK = 50_000;
const DEFAULT_COLS = 100;
const DEFAULT_ROWS = 30;

/**
 * One xterm.js terminal bound to a single PTY session over the shared
 * WebSocket connection. Subscribes on mount, unsubscribes on unmount.
 *
 * The web client is an *observer* of the local Emdash app's PTY: the local
 * app owns the kernel-level grid size, and we mirror it via `resize` server
 * messages and the meta on the share info. We never resize the PTY itself —
 * doing so would race with the local renderer for control of a shared
 * resource and corrupt both displays.
 *
 * Mounted continuously even while inactive so output keeps streaming into
 * scrollback. We only refresh when the pane becomes visible.
 */
export function PtyPane({ ws, session, active }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const sessionId = session.sessionId;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const term = new Terminal({
      cols: session.cols ?? DEFAULT_COLS,
      rows: session.rows ?? DEFAULT_ROWS,
      scrollback: SCROLLBACK,
      convertEol: true,
      fontSize: 13,
      lineHeight: 1.2,
      fontFamily:
        'ui-monospace, SFMono-Regular, "JetBrains Mono", "Fira Code", Menlo, Consolas, "Liberation Mono", monospace',
      allowProposedApi: true,
      cursorBlink: true,
      theme: {
        background: getCss('--xterm-bg', '#0b0d10'),
        foreground: getCss('--xterm-fg', '#e5e7eb'),
      },
    });
    term.loadAddon(
      new WebLinksAddon((event, uri) => {
        event.preventDefault();
        window.open(uri, '_blank', 'noopener,noreferrer');
      })
    );
    term.open(host);
    termRef.current = term;

    const onData = term.onData((data) => {
      ws.send({ type: 'input', sessionId, data });
    });

    const offMsg = ws.on((msg: RemoteServerMessage) => {
      switch (msg.type) {
        case 'snapshot':
          if (msg.sessionId !== sessionId) return;
          term.write(msg.data);
          return;
        case 'data':
          if (msg.sessionId !== sessionId) return;
          term.write(msg.data);
          return;
        case 'resize':
          if (msg.sessionId !== sessionId) return;
          // Local Emdash is authoritative — mirror its size into our xterm
          // without ever calling out to the server.
          try {
            term.resize(msg.cols, msg.rows);
          } catch {}
          return;
        case 'exit':
          if (msg.sessionId !== sessionId) return;
          term.write(
            `\r\n\x1b[2;37m[session exited${msg.exitCode != null ? ` (${msg.exitCode})` : ''}]\x1b[0m\r\n`
          );
          return;
      }
    });

    // Subscribe whenever the WS becomes open. Two cases:
    //   1) Initial mount before the WS finishes connecting (a `subscribe`
    //      sent in `connecting` state would be silently dropped, so we'd
    //      never get a snapshot).
    //   2) Reconnect after a network blip — the server-side bridge lost its
    //      session subscription and we have to re-subscribe.
    let lastSubscribed = false;
    const offState = ws.onState((s) => {
      if (s !== 'open') {
        lastSubscribed = false;
        return;
      }
      if (lastSubscribed) return;
      lastSubscribed = true;
      ws.send({ type: 'subscribe', sessionId });
    });

    return () => {
      onData.dispose();
      offMsg();
      offState();
      try {
        ws.send({ type: 'unsubscribe', sessionId });
      } catch {}
      term.dispose();
      termRef.current = null;
    };
    // session.cols / session.rows are only used as initial sizing — later
    // updates arrive via `resize` server messages, so we deliberately depend
    // only on sessionId to avoid recreating the terminal on size changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws, sessionId]);

  // When the pane becomes visible after being hidden, force a refresh so
  // the (possibly stale) framebuffer matches the now-visible container.
  useEffect(() => {
    if (!active) return;
    const id = requestAnimationFrame(() => {
      try {
        const t = termRef.current;
        if (t) t.refresh(0, t.rows - 1);
      } catch {}
    });
    return () => cancelAnimationFrame(id);
  }, [active]);

  return (
    <div className={`pane${active ? '' : ' hidden'}`} aria-hidden={!active}>
      <div ref={hostRef} className="pane-host" />
    </div>
  );
}

function getCss(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
