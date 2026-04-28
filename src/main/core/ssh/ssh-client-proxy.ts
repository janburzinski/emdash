import type { Client } from 'ssh2';

export class SshClientProxy {
  private _client: Client | null = null;
  private _remoteEnv: Record<string, string> | null = null;

  update(client: Client): void {
    this._client = client;
  }

  updateRemoteEnv(env: Record<string, string>): void {
    this._remoteEnv = env;
  }

  invalidate(): void {
    this._client = null;
    this._remoteEnv = null;
  }

  get remoteEnv(): Record<string, string> | null {
    return this._remoteEnv;
  }

  get client(): Client {
    if (!this._client) {
      throw new Error('SSH connection is not available');
    }
    return this._client;
  }

  get isConnected(): boolean {
    return this._client !== null;
  }
}
