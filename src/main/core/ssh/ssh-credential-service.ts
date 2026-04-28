import { encryptedAppSecretsStore } from '@main/core/secrets/encrypted-app-secrets-store';

export class SshCredentialService {
  private passwordSecretKey(connectionId: string): string {
    return `ssh:${connectionId}:password`;
  }

  private passphraseSecretKey(connectionId: string): string {
    return `ssh:${connectionId}:passphrase`;
  }

  async storePassword(connectionId: string, password: string): Promise<void> {
    try {
      await encryptedAppSecretsStore.setSecret(this.passwordSecretKey(connectionId), password);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to store password for connection ${connectionId}: ${message}`);
    }
  }

  async getPassword(connectionId: string): Promise<string | null> {
    try {
      return await encryptedAppSecretsStore.getSecret(this.passwordSecretKey(connectionId));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to retrieve password for connection ${connectionId}: ${message}`);
    }
  }

  async storePassphrase(connectionId: string, passphrase: string): Promise<void> {
    try {
      await encryptedAppSecretsStore.setSecret(this.passphraseSecretKey(connectionId), passphrase);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to store passphrase for connection ${connectionId}: ${message}`);
    }
  }

  async getPassphrase(connectionId: string): Promise<string | null> {
    try {
      return await encryptedAppSecretsStore.getSecret(this.passphraseSecretKey(connectionId));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to retrieve passphrase for connection ${connectionId}: ${message}`);
    }
  }

  async deleteAllCredentials(connectionId: string): Promise<void> {
    await Promise.all([
      encryptedAppSecretsStore.deleteSecret(this.passwordSecretKey(connectionId)).catch(() => {}),
      encryptedAppSecretsStore.deleteSecret(this.passphraseSecretKey(connectionId)).catch(() => {}),
    ]);
  }
}

export const sshCredentialService = new SshCredentialService();
