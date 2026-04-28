import { useEffect, useState } from 'react';
import type { RemoteServerMessage, RemoteSessionMeta, RemoteShareInfo } from '@shared/remote';
import type { RemoteWsClient, WsConnectionState } from '../lib/ws-client';
import { PtyPane } from './pty-pane';

interface Props {
  ws: RemoteWsClient;
  initial: RemoteShareInfo;
}

export function TaskView({ ws, initial }: Props) {
  const [info, setInfo] = useState<RemoteShareInfo>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(
    initial.sessions[0]?.sessionId ?? null
  );
  const [connState, setConnState] = useState<WsConnectionState>('connecting');

  useEffect(() => {
    const offMsg = ws.on((msg: RemoteServerMessage) => {
      if (msg.type === 'sessions') {
        setInfo((prev) => ({ ...prev, sessions: msg.sessions }));
      } else if (msg.type === 'hello') {
        setInfo(msg.share);
      }
    });
    const offState = ws.onState(setConnState);
    return () => {
      offMsg();
      offState();
    };
  }, [ws]);

  // Derive the actually-active tab so a vanished session falls back to the
  // first one without writing to state inside an effect.
  const activeId =
    info.sessions.find((s) => s.sessionId === selectedId)?.sessionId ??
    info.sessions[0]?.sessionId ??
    null;

  return (
    <div className="app">
      <div className="titlebar">
        <span className="prompt">~</span>
        <span className="task-name">{info.taskName}</span>
        {info.taskBranch ? (
          <>
            <span className="sep">on</span>
            <span className="task-branch">{info.taskBranch}</span>
          </>
        ) : null}
        <ConnStatus state={connState} />
      </div>
      <div className="tabs" role="tablist">
        {info.sessions.map((s) => (
          <SessionTab
            key={s.sessionId}
            session={s}
            active={s.sessionId === activeId}
            onClick={() => setSelectedId(s.sessionId)}
          />
        ))}
      </div>
      <div className="panel">
        {info.sessions.length === 0 ? (
          <div className="empty">No active sessions in this task.</div>
        ) : (
          info.sessions.map((s) => (
            <PtyPane key={s.sessionId} ws={ws} session={s} active={s.sessionId === activeId} />
          ))
        )}
      </div>
    </div>
  );
}

function SessionTab({
  session,
  active,
  onClick,
}: {
  session: RemoteSessionMeta;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      className={`tab${active ? ' active' : ''}`}
      onClick={onClick}
    >
      <span className="kind">{session.kind === 'conversation' ? 'agent' : 'term'}</span>
      <span>{session.title}</span>
    </button>
  );
}

function ConnStatus({ state }: { state: WsConnectionState }) {
  const cls =
    state === 'open' ? 'ok' : state === 'connecting' ? 'warn' : state === 'error' ? 'err' : '';
  const label =
    state === 'open'
      ? 'connected'
      : state === 'connecting'
        ? 'connecting…'
        : state === 'error'
          ? 'error'
          : 'reconnecting…';
  return (
    <div className="status">
      <span className={`status-dot ${cls}`} aria-hidden />
      <span>{label}</span>
    </div>
  );
}
