import { Check, Plus } from '@phosphor-icons/react';
import React from 'react';
import { AgentProviderId } from '@shared/agent-provider-registry';
import type { McpCatalogEntry, McpServer } from '@shared/mcp/types';
import AgentLogo from '@renderer/lib/components/agent-logo';
import { agentConfig } from '@renderer/utils/agentConfig';
import { McpServerIcon } from '@renderer/utils/mcpIcons';

interface McpCardProps {
  server?: McpServer;
  catalogEntry?: McpCatalogEntry;
  onEdit: (server: McpServer) => void;
  onAdd?: (entry: McpCatalogEntry) => void;
}

function getSyncedProviders(server?: McpServer) {
  if (!server) return [];
  return server.providers.flatMap((id) => {
    const cfg = agentConfig[id as AgentProviderId];
    return cfg ? [{ id, ...cfg }] : [];
  });
}

export const McpCard: React.FC<McpCardProps> = ({ server, catalogEntry, onEdit, onAdd }) => {
  const name = server?.name ?? catalogEntry?.name ?? 'Unknown';
  const description = catalogEntry?.description ?? (server ? `${server.transport} server` : '');
  const isInstalled = !!server;
  const syncedProviders = getSyncedProviders(server);

  const handleClick = () => {
    if (isInstalled && server) {
      onEdit(server);
    } else if (catalogEntry && onAdd) {
      onAdd(catalogEntry);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className="group flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/40"
    >
      <McpServerIcon name={name} iconKey={catalogEntry?.key ?? server?.name} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-foreground">{name}</div>
        {description && <div className="truncate text-xs text-foreground-muted">{description}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {syncedProviders.length > 0 && (
          <div className="flex items-center gap-1">
            {syncedProviders.map((p) => (
              <AgentLogo
                key={p.id}
                logo={p.logo}
                alt={p.alt}
                isSvg={p.isSvg}
                invertInDark={p.invertInDark}
                className="h-3.5 w-3.5 rounded-sm opacity-70"
              />
            ))}
          </div>
        )}
        {isInstalled ? (
          <Check className="h-4 w-4 text-foreground-muted" aria-label="Added" />
        ) : (
          onAdd && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (catalogEntry) onAdd(catalogEntry);
              }}
              className="rounded-md p-1.5 text-foreground-muted opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={`Add ${name}`}
            >
              <Plus className="h-4 w-4" />
            </button>
          )
        )}
      </div>
    </div>
  );
};
