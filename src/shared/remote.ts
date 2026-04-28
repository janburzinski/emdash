/**
 * Remote-share domain types.
 *
 * A "remote share" exposes a single Task (and all of its conversations and
 * terminals) over the embedded HTTP+WS server, addressable via a token in the
 * URL: `/s/<token>`. The token is generated client-side and only its hash is
 * persisted (`tokenHash`).
 */

export interface RemoteShareSummary {
  id: string;
  taskId: string;
  label: string | null;
  createdAt: string;
  /** Last 4 chars of the token, for UI ("ends with …a3f2"). */
  tokenSuffix: string;
}

/** Returned exactly once on creation — full token is never re-shown. */
export interface RemoteShareCreated extends RemoteShareSummary {
  /** Full plaintext token. Only available at creation time. */
  token: string;
  url: string;
}

export interface RemoteServerStatus {
  enabled: boolean;
  running: boolean;
  bindAddress: string;
  port: number;
  /** Resolvable URL for sharing (e.g. http://192.168.1.2:7777). null when not running. */
  baseUrl: string | null;
}

/** Metadata for a single PTY-backed session within a shared task. */
export interface RemoteSessionMeta {
  /** Deterministic PTY session id: `${projectId}:${scopeId}:${leafId}`. */
  sessionId: string;
  kind: 'conversation' | 'terminal';
  /** Conversation id or terminal id. */
  leafId: string;
  title: string;
  provider?: string;
  /**
   * Current PTY grid size. The local Emdash app is the authoritative source —
   * the web client mirrors this and never tries to resize the PTY itself.
   * Undefined means the local app has not yet pushed a size for this session.
   */
  cols?: number;
  rows?: number;
}

export interface RemoteShareInfo {
  taskId: string;
  taskName: string;
  taskBranch?: string;
  sessions: RemoteSessionMeta[];
}

// ── WebSocket protocol ────────────────────────────────────────────────────────

export type RemoteClientMessage =
  | { type: 'subscribe'; sessionId: string }
  | { type: 'unsubscribe'; sessionId: string }
  | { type: 'input'; sessionId: string; data: string }
  | { type: 'resize'; sessionId: string; cols: number; rows: number }
  | { type: 'ping' };

export type RemoteServerMessage =
  | { type: 'hello'; share: RemoteShareInfo }
  | { type: 'sessions'; sessions: RemoteSessionMeta[] }
  | { type: 'snapshot'; sessionId: string; data: string }
  | { type: 'data'; sessionId: string; data: string }
  | { type: 'resize'; sessionId: string; cols: number; rows: number }
  | { type: 'exit'; sessionId: string; exitCode?: number; signal?: number | string }
  | { type: 'error'; reason: string }
  | { type: 'pong' };
