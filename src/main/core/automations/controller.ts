import { homedir } from 'node:os';
import type { CreateAutomationInput, UpdateAutomationInput } from '@shared/automations/types';
import { createRPCController } from '@shared/ipc/rpc';
import { err, ok, type Result } from '@shared/result';
import { automationsService } from '@main/core/automations/AutomationsService';
import { log } from '@main/lib/logger';

const HOME_DIR = homedir();

// Strip the user's home path from outbound error strings so IPC consumers
// (and any logs they end up in) don't see absolute filesystem paths.
function scrubErrorMessage(message: string): string {
  if (!HOME_DIR) return message;
  return message.split(HOME_DIR).join('~');
}

async function wrap<T>(scope: string, fn: () => Promise<T>): Promise<Result<T, string>> {
  try {
    return ok(await fn());
  } catch (error) {
    log.error(`[Automations.${scope}]`, error);
    const raw = error instanceof Error ? error.message : String(error);
    return err(scrubErrorMessage(raw));
  }
}

export const automationsController = createRPCController({
  list: () => wrap('list', () => automationsService.list()),

  get: (args: { id: string }) => wrap('get', () => automationsService.get(args.id)),

  create: (args: CreateAutomationInput) => wrap('create', () => automationsService.create(args)),

  update: (args: UpdateAutomationInput) => wrap('update', () => automationsService.update(args)),

  delete: (args: { id: string }) => wrap('delete', () => automationsService.delete(args.id)),

  pause: (args: { id: string }) => wrap('pause', () => automationsService.pause(args.id)),

  resume: (args: { id: string }) => wrap('resume', () => automationsService.resume(args.id)),

  toggle: (args: { id: string }) => wrap('toggle', () => automationsService.toggleStatus(args.id)),

  triggerNow: (args: { id: string }) =>
    wrap('triggerNow', () => automationsService.triggerNow(args.id)),

  runLogs: (args: { automationId: string; limit?: number }) =>
    wrap('runLogs', () => automationsService.getRunLogs(args.automationId, args.limit)),

  getMemory: (args: { id: string }) =>
    wrap('getMemory', () => automationsService.getMemory(args.id)),

  setMemory: (args: { id: string; content: string }) =>
    wrap('setMemory', () => automationsService.setMemory(args.id, args.content)),

  clearMemory: (args: { id: string }) =>
    wrap('clearMemory', () => automationsService.clearMemory(args.id)),
});
