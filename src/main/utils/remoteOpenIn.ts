import { quoteShellArg } from './shellEscape';

type RemoteEditorScheme = 'vscode' | 'cursor';

export function buildRemoteSshAuthority(host: string, username: string): string {
  const normalizedHost = host.trim();
  if (!normalizedHost) return normalizedHost;

  // Keep host as-is when caller already included user info (for SSH aliases like user@host).
  if (normalizedHost.includes('@')) return normalizedHost;

  const normalizedUsername = username.trim();
  if (!normalizedUsername) return normalizedHost;

  return `${normalizedUsername}@${normalizedHost}`;
}

export function buildRemoteEditorUrl(
  scheme: RemoteEditorScheme,
  host: string,
  username: string,
  targetPath: string
): string {
  const authority = buildRemoteSshAuthority(host, username);
  const encodedAuthority = encodeURIComponent(authority);
  const normalizedTargetPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
  return `${scheme}://vscode-remote/ssh-remote+${encodedAuthority}${normalizedTargetPath}`;
}

type GhosttyRemoteExecInput = {
  host: string;
  username: string;
  port: number | string;
  targetPath: string;
};

export function buildRemoteTerminalShellCommand(targetPath: string): string {
  return `cd ${quoteShellArg(targetPath)} && (if command -v infocmp >/dev/null 2>&1 && [ -n "\${TERM:-}" ] && infocmp "\${TERM}" >/dev/null 2>&1; then :; else export TERM=xterm-256color; fi) && (exec "\${SHELL:-/bin/bash}" || exec /bin/bash || exec /bin/sh)`;
}

export function buildRemoteSshCommand(input: GhosttyRemoteExecInput): string {
  const sshAuthority = buildRemoteSshAuthority(input.host, input.username);
  const remoteCommand = buildRemoteTerminalShellCommand(input.targetPath);
  return `ssh ${quoteShellArg(sshAuthority)} -o ${quoteShellArg('ControlMaster=no')} -o ${quoteShellArg('ControlPath=none')} -p ${quoteShellArg(String(input.port))} -t ${quoteShellArg(remoteCommand)}`;
}

export function buildGhosttyRemoteExecArgs(input: GhosttyRemoteExecInput): string[] {
  const sshAuthority = buildRemoteSshAuthority(input.host, input.username);
  const remoteCommand = buildRemoteTerminalShellCommand(input.targetPath);
  return [
    'ssh',
    sshAuthority,
    '-o',
    'ControlMaster=no',
    '-o',
    'ControlPath=none',
    '-p',
    String(input.port),
    '-t',
    remoteCommand,
  ];
}
