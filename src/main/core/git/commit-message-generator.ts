import { execFile, spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { CommitMessageAgentId } from '@shared/commit-message';
import { GIT_EXECUTABLE } from '@main/core/utils/exec';
import { log } from '@main/lib/logger';

const execFileAsync = promisify(execFile);

const MAX_DIFF_BYTES = 80_000;
const SPAWN_TIMEOUT_MS = 120_000;

export type GenerateCommitMessageError =
  | { type: 'no_changes' }
  | { type: 'agent_not_found'; agent: CommitMessageAgentId }
  | { type: 'agent_failed'; agent: CommitMessageAgentId; message: string }
  | { type: 'agent_timeout'; agent: CommitMessageAgentId }
  | { type: 'empty_response'; agent: CommitMessageAgentId }
  | { type: 'git_error'; message: string };

export type GeneratedCommitMessage = {
  title: string;
  description: string;
};

export async function generateCommitMessage(
  cwd: string,
  agent: CommitMessageAgentId,
  customInstructions: string,
  model: string | null,
  reasoning: string | null
): Promise<
  { ok: true; data: GeneratedCommitMessage } | { ok: false; error: GenerateCommitMessageError }
> {
  let diff: string;
  try {
    diff = await readDiff(cwd);
  } catch (e) {
    return { ok: false, error: { type: 'git_error', message: String(e) } };
  }
  if (!diff.trim()) {
    return { ok: false, error: { type: 'no_changes' } };
  }

  const prompt = buildPrompt(diff, customInstructions);

  try {
    const text = await invokeAgent(agent, prompt, cwd, model, reasoning);
    const trimmed = text.trim();
    if (!trimmed) return { ok: false, error: { type: 'empty_response', agent } };
    return { ok: true, data: parseMessage(trimmed) };
  } catch (e) {
    if (e instanceof AgentNotFoundError) {
      return { ok: false, error: { type: 'agent_not_found', agent } };
    }
    if (e instanceof AgentTimeoutError) {
      return { ok: false, error: { type: 'agent_timeout', agent } };
    }
    log.error('generateCommitMessage failed', { agent, cwd, error: e });
    return { ok: false, error: { type: 'agent_failed', agent, message: String(e) } };
  }
}

async function readDiff(cwd: string): Promise<string> {
  const staged = await runGit(cwd, ['diff', '--cached', '--no-color', '-U2']);
  if (staged.trim()) return truncate(staged);
  const unstaged = await runGit(cwd, ['diff', '--no-color', '-U2']);
  return truncate(unstaged);
}

async function runGit(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(GIT_EXECUTABLE, args, {
    cwd,
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout;
}

function truncate(diff: string): string {
  if (Buffer.byteLength(diff, 'utf8') <= MAX_DIFF_BYTES) return diff;
  const head = diff.slice(0, MAX_DIFF_BYTES);
  return `${head}\n\n[diff truncated to ${MAX_DIFF_BYTES} bytes]`;
}

function buildPrompt(diff: string, customInstructions: string): string {
  const customBlock = customInstructions.trim()
    ? `\nUser instructions (highest priority):\n${customInstructions.trim()}\n`
    : '';
  return [
    'You are generating a git commit message for a staged diff.',
    '',
    'Output rules:',
    '- First line: subject in conventional-commit style, imperative mood, <= 72 chars, no trailing period.',
    '- Optionally a blank line followed by a short body (wrap at ~72 chars) explaining WHY, not what the code already says.',
    '- Output ONLY the commit message. No preamble, no code fences, no explanations.',
    customBlock,
    'Staged diff:',
    '```diff',
    diff,
    '```',
  ].join('\n');
}

function parseMessage(text: string): GeneratedCommitMessage {
  const cleaned = stripCodeFence(text).trim();
  const lines = cleaned.split('\n');
  const title = (lines[0] ?? '').trim();
  let bodyStart = 1;
  while (bodyStart < lines.length && lines[bodyStart].trim() === '') bodyStart++;
  const description = lines.slice(bodyStart).join('\n').trim();
  return { title, description };
}

function stripCodeFence(text: string): string {
  const fenceMatch = text.match(/^```(?:\w+)?\n([\s\S]*?)\n```\s*$/);
  return fenceMatch ? fenceMatch[1] : text;
}

class AgentNotFoundError extends Error {}
class AgentTimeoutError extends Error {}

async function invokeAgent(
  agent: CommitMessageAgentId,
  prompt: string,
  cwd: string,
  model: string | null,
  reasoning: string | null
): Promise<string> {
  switch (agent) {
    case 'claude':
      return invokeClaude(prompt, cwd, model, reasoning);
    case 'codex':
      return invokeCodex(prompt, cwd, model, reasoning);
    case 'opencode':
      return invokeOpencode(prompt, cwd, model, reasoning);
  }
}

async function invokeClaude(
  prompt: string,
  cwd: string,
  model: string | null,
  reasoning: string | null
): Promise<string> {
  const args = [
    '-p',
    '--bare',
    '--dangerously-skip-permissions',
    '--output-format',
    'json',
    ...(model ? ['--model', model] : []),
    ...(reasoning ? ['--effort', reasoning] : []),
    prompt,
  ];
  const stdout = await runWithStdoutCapture('claude', args, cwd);
  try {
    const parsed = JSON.parse(stdout) as { result?: unknown };
    if (typeof parsed.result === 'string') return parsed.result;
  } catch {
    // Fall through to raw stdout if JSON parsing fails.
  }
  return stdout;
}

async function invokeCodex(
  prompt: string,
  cwd: string,
  model: string | null,
  reasoning: string | null
): Promise<string> {
  const tmpDir = await mkdtemp(join(tmpdir(), 'emdash-codex-'));
  const outPath = join(tmpDir, 'message.txt');
  try {
    const args = [
      'exec',
      '--full-auto',
      '--skip-git-repo-check',
      '--ephemeral',
      ...(model ? ['--model', model] : []),
      ...(reasoning ? ['-c', `model_reasoning_effort=${reasoning}`] : []),
      '-C',
      cwd,
      '--output-last-message',
      outPath,
      prompt,
    ];
    await runWithStdoutCapture('codex', args, cwd);
    return await readFile(outPath, 'utf8');
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function invokeOpencode(
  prompt: string,
  cwd: string,
  model: string | null,
  reasoning: string | null
): Promise<string> {
  const args = [
    'run',
    '--dangerously-skip-permissions',
    ...(model ? ['--model', model] : []),
    ...(reasoning ? ['--variant', reasoning] : []),
    prompt,
  ];
  return runWithStdoutCapture('opencode', args, cwd);
}

function runWithStdoutCapture(command: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      settle(() => reject(new AgentTimeoutError(`${command} timed out`)));
    }, SPAWN_TIMEOUT_MS);

    child.stdout.on('data', (b) => {
      stdout += b.toString('utf8');
    });
    child.stderr.on('data', (b) => {
      stderr += b.toString('utf8');
    });
    child.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        settle(() => reject(new AgentNotFoundError(command)));
      } else {
        settle(() => reject(err));
      }
    });
    child.on('close', (code) => {
      if (code === 0) {
        settle(() => resolve(stdout));
      } else {
        const detail = stderr.trim() || stdout.trim() || `exit ${code}`;
        settle(() => reject(new Error(`${command} exited ${code}: ${detail.slice(0, 500)}`)));
      }
    });
  });
}
