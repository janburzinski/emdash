import {
  CircleNotch as Loader2,
  Plus,
  ArrowsClockwise as RefreshCw,
  MagnifyingGlass as Search,
} from '@phosphor-icons/react';
import React, { useState } from 'react';
import { useModalContext, useShowModal } from '@renderer/lib/modal/modal-provider';
import { Button } from '@renderer/lib/ui/button';
import { Input } from '@renderer/lib/ui/input';
import { Separator } from '@renderer/lib/ui/separator';
import { McpCard } from './McpCard';
import type { McpModalMode } from './McpModal';
import { useMcps } from './useMcps';

export const McpView: React.FC = () => {
  const {
    installed,
    catalog,
    providers,
    isLoading,
    isRefreshing,
    saveServer,
    removeServer,
    refresh,
  } = useMcps();

  const { showModal, closeModal } = useModalContext();
  const showConfirm = useShowModal('confirmActionModal');
  const [search, setSearch] = useState('');

  const handleRemoveRequest = (serverName: string) => {
    closeModal();
    showConfirm({
      title: 'Remove MCP server?',
      description: `This will remove "${serverName}" from all agents. This action cannot be undone.`,
      confirmLabel: 'Remove',
      onSuccess: () => void removeServer(serverName),
    });
  };

  const openModal = (mode: McpModalMode) => {
    const source =
      mode.type === 'add-catalog' ? 'catalog' : mode.type === 'add-custom' ? 'custom' : null;
    showModal('mcpServerModal', {
      mode,
      providers,
      onSave: (server) => saveServer(server, source),
      onRemove: handleRemoveRequest,
    });
  };

  const lowerSearch = search.toLowerCase();
  const installedNames = new Set(installed.map((s) => s.name));
  const filteredInstalled = installed.filter(
    (s) => !search || s.name.toLowerCase().includes(lowerSearch)
  );
  const filteredCatalog = catalog.filter(
    (c) =>
      !installedNames.has(c.key) &&
      (!search ||
        c.name.toLowerCase().includes(lowerSearch) ||
        c.description.toLowerCase().includes(lowerSearch))
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-foreground-muted" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-background text-foreground">
      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-8 px-10 py-10">
          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl">MCP</h2>
                <p className="text-sm text-foreground-muted">
                  Connect agents to external data and tools via the{' '}
                  <a
                    href="https://modelcontextprotocol.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline decoration-foreground-muted/40 underline-offset-2 hover:decoration-foreground"
                  >
                    Model Context Protocol
                  </a>
                  .
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openModal({ type: 'add-custom' })}
                className="shrink-0"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Custom MCP
              </Button>
            </div>
            <Separator />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search servers..."
                className="pl-9"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={refresh}
              disabled={isRefreshing}
              aria-label="Refresh providers"
            >
              <RefreshCw
                className={`h-4 w-4 text-foreground-muted ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>

          {filteredInstalled.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="px-2 text-xs font-medium uppercase tracking-wider text-foreground-muted">
                Added
              </h3>
              <div className="flex flex-col">
                {filteredInstalled.map((server) => (
                  <McpCard
                    key={server.name}
                    server={server}
                    catalogEntry={catalog.find((c) => c.key === server.name)}
                    onEdit={(s) => openModal({ type: 'edit', server: s })}
                  />
                ))}
              </div>
            </section>
          )}

          {filteredCatalog.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="px-2 text-xs font-medium uppercase tracking-wider text-foreground-muted">
                Catalog
              </h3>
              <div className="flex flex-col">
                {filteredCatalog.map((entry) => (
                  <McpCard
                    key={entry.key}
                    catalogEntry={entry}
                    onEdit={() => {}}
                    onAdd={(e) => openModal({ type: 'add-catalog', entry: e })}
                  />
                ))}
              </div>
            </section>
          )}

          {filteredInstalled.length === 0 && filteredCatalog.length === 0 && (
            <p className="px-2 text-sm text-foreground-muted">
              {search ? 'No servers match your search.' : 'No servers available.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
