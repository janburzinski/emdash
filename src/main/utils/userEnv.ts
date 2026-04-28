import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { log } from '@main/lib/logger';

const PRESERVE_KEYS = new Set([
  // AppImage
  'APPDIR',
  'APPIMAGE',
  'ARGV0',
  'CHROME_DESKTOP',
  'GSETTINGS_SCHEMA_DIR',
  'OWD',
  // Electron
  'ELECTRON_RUN_AS_NODE',
  'ELECTRON_NO_ATTACH_CONSOLE',
  'ELECTRON_ENABLE_LOGGING',
  'ELECTRON_ENABLE_STACK_DUMPING',
  // Build toolchain
  'NODE_ENV',
]);

const USER_BIN_DIRS = [path.join(os.homedir(), '.local', 'bin')];

function pathEntryExists(entry: string): boolean {
  try {
    return fs.statSync(entry).isDirectory();
  } catch {
    return false;
  }
}

function parseEnvOutput(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1);
    if (key && /^[A-Za-z_]\w*$/.test(key)) {
      result[key] = value;
    }
  }
  return result;
}

function mergePath(shellPath: string, currentPath: string): string {
  const sep = process.platform === 'win32' ? ';' : ':';
  const shellEntries = shellPath.split(sep).filter(Boolean);
  const currentEntries = currentPath.split(sep).filter(Boolean);

  // Shell entries first (user's full PATH), then any Electron-only entries not in shell PATH
  const seen = new Set(shellEntries);
  const extra = currentEntries.filter((p) => !seen.has(p));
  return [...shellEntries, ...extra].join(sep);
}

export function ensureUserBinDirsInPath(candidates: string[] = USER_BIN_DIRS): string[] {
  const currentPath = process.env.PATH ?? '';
  const entries = currentPath.split(path.delimiter).filter(Boolean);
  const existing = new Set(entries);
  const additions = candidates.filter(
    (candidate) => pathEntryExists(candidate) && !existing.has(candidate)
  );

  if (additions.length === 0) {
    return [];
  }

  process.env.PATH = [...additions, ...entries].join(path.delimiter);
  return additions;
}

export async function resolveUserEnv(): Promise<void> {
  if (process.platform === 'win32') {
    // Windows PATH is managed differently; no login-shell capture needed.
    return;
  }

  const shell = process.env.SHELL ?? (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash');

  try {
    const raw = execSync(`${shell} -ilc 'env'`, {
      encoding: 'utf8',
      timeout: 5_000,
      env: {
        ...process.env,
        // Prevent oh-my-zsh and tmux plugins from producing extra output or
        // blocking the env capture.
        DISABLE_AUTO_UPDATE: 'true',
        ZSH_TMUX_AUTOSTART: 'false',
        ZSH_TMUX_AUTOSTARTED: 'true',
      },
    });

    const shellEnv = parseEnvOutput(raw);

    for (const [key, value] of Object.entries(shellEnv)) {
      if (PRESERVE_KEYS.has(key)) continue;

      if (key === 'PATH') {
        const current = process.env.PATH ?? '';
        process.env.PATH = mergePath(value, current);
      } else {
        process.env[key] = value;
      }
    }

    log.info('[userEnv] Resolved login-shell env', {
      shell,
      pathEntries: process.env.PATH?.split(':').length ?? 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn('[userEnv] Failed to resolve login-shell env, falling back to process.env', {
      shell,
      error: message,
    });
  }
}

export function parseRemoteEnvOutput(raw: string): Record<string, string> {
  return parseEnvOutput(raw);
}
