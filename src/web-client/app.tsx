import { useEffect, useMemo, useState } from 'react';
import type { RemoteShareInfo } from '@shared/remote';
import { TaskView } from './components/task-view';
import { RemoteWsClient } from './lib/ws-client';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'no-token' }
  | { kind: 'invalid' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; info: RemoteShareInfo };

function tokenFromUrl(): string | null {
  const m = location.pathname.match(/^\/s\/([^/]+)\/?$/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

export function App() {
  const token = useMemo(() => tokenFromUrl(), []);
  const [load, setLoad] = useState<LoadState>(() =>
    token ? { kind: 'loading' } : { kind: 'no-token' }
  );

  useEffect(() => {
    if (!token) return;
    let aborted = false;
    fetch(`/api/share?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (aborted) return;
        if (res.status === 401 || res.status === 404) {
          setLoad({ kind: 'invalid' });
          return;
        }
        if (!res.ok) {
          setLoad({ kind: 'error', message: `HTTP ${res.status}` });
          return;
        }
        const info = (await res.json()) as RemoteShareInfo;
        setLoad({ kind: 'ready', info });
      })
      .catch((e: unknown) => {
        if (aborted) return;
        setLoad({ kind: 'error', message: String((e as Error)?.message || e) });
      });
    return () => {
      aborted = true;
    };
  }, [token]);

  if (load.kind === 'loading') {
    return (
      <div className="center">
        <div className="title">Connecting…</div>
      </div>
    );
  }
  if (load.kind === 'no-token') {
    return (
      <div className="center">
        <div className="title">Emdash Remote</div>
        <div className="body">
          Open a share link from your local Emdash app. Links look like{' '}
          <code>{location.origin}/s/&lt;token&gt;</code>.
        </div>
      </div>
    );
  }
  if (load.kind === 'invalid') {
    return (
      <div className="center">
        <div className="title error">Share not found</div>
        <div className="body">
          The link is no longer valid. The owner may have revoked it, or the host has restarted
          without this share.
        </div>
      </div>
    );
  }
  if (load.kind === 'error') {
    return (
      <div className="center">
        <div className="title error">Connection failed</div>
        <div className="body">{load.message}</div>
      </div>
    );
  }

  return <TaskRoot token={token!} info={load.info} />;
}

function TaskRoot({ token, info }: { token: string; info: RemoteShareInfo }) {
  const ws = useMemo(() => new RemoteWsClient(token), [token]);
  useEffect(() => {
    ws.connect();
    return () => ws.dispose();
  }, [ws]);
  return <TaskView ws={ws} initial={info} />;
}
