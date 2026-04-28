import { AGENT_PROVIDER_IDS, type AgentProviderId } from './agent-provider-registry';

const CONV_SEP = '-conv-';

export function makePtyId(provider: AgentProviderId | 'shell', conversationId: string): string {
  return `${provider}${CONV_SEP}${conversationId}`;
}

export function parsePtyId(id: string): {
  providerId: AgentProviderId | 'shell';
  conversationId: string;
} | null {
  // Try 'shell' sentinel first, then all known provider IDs longest-first to avoid prefix collisions.
  const candidates: Array<AgentProviderId | 'shell'> = [
    'shell',
    ...[...AGENT_PROVIDER_IDS].sort((a, b) => b.length - a.length),
  ];
  for (const pid of candidates) {
    const prefix = pid + CONV_SEP;
    if (id.startsWith(prefix)) {
      return { providerId: pid, conversationId: id.slice(prefix.length) };
    }
  }
  return null;
}
