import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRPCController } from '@shared/ipc/rpc';
import { err, ok } from '@shared/result';
import { resolveCommandPath } from '@main/core/dependencies/probe';
import { resolveWorkspace } from '@main/core/projects/utils';
import { getLocalExec } from '@main/core/utils/exec';
import { log } from '@main/lib/logger';

const COMMIT_MODEL = 'gpt-5-mini';
const REASONING_EFFORT = 'high';
const MAX_DIFF_BYTES = 200_000;
const CODEX_TIMEOUT_MS = 120_000;

const COMMIT_PROMPT = `You generate Git commit messages. You will receive a unified diff of staged changes between <diff> tags.

Rules:
- Output ONLY the commit message — no preamble, no markdown fences, no commentary.
- Use Conventional Commits format: \`<type>(optional scope): <subject>\` followed by a blank line and an optional body.
- Subject line: imperative mood, lower case after the type, no trailing period, ≤ 72 chars.
- Body (if needed): wrap at 72 chars, explain the *why* not the *what*. Skip the body for trivial changes.
- Choose the type that best fits: feat, fix, refactor, perf, docs, style, test, build, ci, chore.

<diff>
{{DIFF}}
</diff>`;

async function runCodex(
  prompt: string
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const exec = getLocalExec();
  const codexPath = await resolveCommandPath('codex', exec);
  if (!codexPath) {
    return { ok: false, error: 'Codex CLI not found. Install with: npm install -g @openai/codex' };
  }

  const tmp = await mkdtemp(path.join(tmpdir(), 'emdash-commit-'));
  const outFile = path.join(tmp, 'message.txt');

  try {
    const args = [
      'exec',
      '--skip-git-repo-check',
      '-m',
      COMMIT_MODEL,
      '-c',
      `model_reasoning_effort="${REASONING_EFFORT}"`,
      '--output-last-message',
      outFile,
      prompt,
    ];

    const result = await new Promise<{ code: number | null; stderr: string }>((resolve) => {
      const child = spawn(codexPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';
      child.stderr.on('data', (d: Buffer) => {
        stderr += d.toString();
      });
      child.stdout.resume(); // drain to avoid backpressure
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
      }, CODEX_TIMEOUT_MS);
      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({ code, stderr });
      });
      child.on('error', (e) => {
        clearTimeout(timer);
        resolve({ code: -1, stderr: String(e) });
      });
    });

    if (result.code !== 0) {
      return { ok: false, error: result.stderr.trim() || `codex exited with code ${result.code}` };
    }

    const message = (await readFile(outFile, 'utf8')).trim();
    if (!message) return { ok: false, error: 'Codex returned an empty commit message.' };
    return { ok: true, message };
  } finally {
    await rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

export const aiController = createRPCController({
  generateCommitMessage: async (projectId: string, workspaceId: string) => {
    try {
      const env = resolveWorkspace(projectId, workspaceId);
      if (!env) return err({ type: 'not_found' as const });

      let diff = await env.git.getStagedUnifiedDiff();
      if (!diff.trim()) {
        return err({ type: 'no_staged_changes' as const });
      }
      if (diff.length > MAX_DIFF_BYTES) {
        diff = diff.slice(0, MAX_DIFF_BYTES) + '\n...[diff truncated]';
      }

      const result = await runCodex(COMMIT_PROMPT.replace('{{DIFF}}', diff));
      if (!result.ok) return err({ type: 'codex_error' as const, message: result.error });
      return ok({ message: result.message });
    } catch (e) {
      log.error('aiCtrl.generateCommitMessage failed', { projectId, workspaceId, error: e });
      return err({ type: 'codex_error' as const, message: String(e) });
    }
  },
});
