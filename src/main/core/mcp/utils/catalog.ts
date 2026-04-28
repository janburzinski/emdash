import { catalogData } from '@shared/mcp/catalog';
import type { McpCatalogEntry } from '@shared/mcp/types';

export function loadCatalog(): McpCatalogEntry[] {
  return Object.entries(catalogData).map(([key, entry]) => ({
    key,
    name: entry.name,
    description: entry.description,
    docsUrl: entry.docsUrl,
    defaultConfig: entry.config,
    credentialKeys: entry.credentialKeys,
  }));
}
