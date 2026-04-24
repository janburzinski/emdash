import { formatDistanceToNowStrict } from 'date-fns';
import {
  TRIGGER_TYPE_LABELS,
  type AutomationSchedule,
  type TriggerType,
} from '@shared/automations/types';

export { TRIGGER_TYPE_LABELS };

export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function describeTrigger(triggerType: TriggerType | null): string {
  if (!triggerType) return 'No trigger';
  return TRIGGER_TYPE_LABELS[triggerType];
}

export function describeScheduleShort(schedule: AutomationSchedule): string {
  switch (schedule.type) {
    case 'hourly':
      return 'Hourly';
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    case 'custom':
      return describeCustomRRuleShort(schedule.rrule);
  }
}

function describeCustomRRuleShort(rrule: string): string {
  const fields = parseRRuleFields(rrule);
  if (!fields) return 'Custom';
  const freq = fields.get('FREQ');
  const interval = Number(fields.get('INTERVAL') ?? '1');
  const n = Number.isInteger(interval) && interval > 0 ? interval : 1;
  switch (freq) {
    case 'MINUTELY':
      return n === 1 ? 'Every minute' : `Every ${n}m`;
    case 'HOURLY':
      return n === 1 ? 'Hourly' : `Every ${n}h`;
    case 'DAILY':
      return n === 1 ? 'Daily' : `Every ${n}d`;
    case 'WEEKLY':
      return n === 1 ? 'Weekly' : `Every ${n}w`;
    case 'MONTHLY':
      return n === 1 ? 'Monthly' : `Every ${n}mo`;
    default:
      return 'Custom';
  }
}

function parseRRuleFields(rrule: string): Map<string, string> | null {
  const trimmed = rrule.trim();
  if (!trimmed) return null;
  const body = trimmed.startsWith('RRULE:') ? trimmed.slice('RRULE:'.length) : trimmed;
  const fields = new Map<string, string>();
  for (const part of body.split(';')) {
    const [k, v] = part.split('=', 2);
    if (!k || !v) continue;
    fields.set(k.trim().toUpperCase(), v.trim());
  }
  return fields;
}

function toCompact(date: Date): string {
  return formatDistanceToNowStrict(date, { roundingMethod: 'floor', addSuffix: false })
    .replace(/ seconds?/, 's')
    .replace(/ minutes?/, 'm')
    .replace(/ hours?/, 'h')
    .replace(/ days?/, 'd')
    .replace(/ months?/, 'mo')
    .replace(/ years?/, 'y');
}

export function formatRelative(iso: string | null): string {
  if (!iso) return 'never';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'never';
  return `${toCompact(date)} ago`;
}

export function formatRelativeFuture(iso: string | null): string {
  if (!iso) return 'never';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'never';
  if (date.getTime() - Date.now() <= 0) return 'now';
  return `in ${toCompact(date)}`;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}
