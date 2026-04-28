export interface McpServer {
  name: string;
  transport: 'stdio' | 'http';
  // stdio
  command?: string;
  args?: string[];
  // http
  url?: string;
  headers?: Record<string, string>;
  // common
  env?: Record<string, string>;
  providers: string[];
}

export interface CredentialKey {
  key: string;
  required: boolean;
}

export interface McpCatalogEntry {
  key: string;
  name: string;
  description: string;
  docsUrl: string;
  defaultConfig: RawServerEntry;
  credentialKeys: CredentialKey[];
}

export type RawServerEntry = Record<string, unknown>;

export type ServerMap = Record<string, RawServerEntry>;

export interface AgentMcpMeta {
  agentId: string;
  configPath: string;
  serversPath: string[];
  template: Record<string, unknown>;
  isToml: boolean;
  adapter: AdapterType;
}

export type AdapterType = 'passthrough' | 'gemini' | 'cursor' | 'codex' | 'opencode' | 'copilot';

export interface McpLoadAllResponse {
  installed: McpServer[];
  catalog: McpCatalogEntry[];
}

export interface McpProvidersResponse {
  id: string;
  name: string;
  installed: boolean;
  supportsHttp: boolean;
}
