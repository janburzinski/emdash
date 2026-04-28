import { createRPCController } from '@/shared/ipc/rpc';
import type { ProviderCustomConfig } from '@shared/app-settings';
import { providerOverrideSettings } from './provider-settings-service';

export const providerSettingsController = createRPCController({
  getItemWithMeta: (
    id: string
  ): Promise<{
    value: ProviderCustomConfig;
    defaults: ProviderCustomConfig;
    overrides: Partial<ProviderCustomConfig>;
  } | null> => providerOverrideSettings.getItemWithMeta(id),

  updateItem: (id: string, config: Partial<ProviderCustomConfig>): Promise<void> =>
    providerOverrideSettings.updateItem(id, config),

  resetItem: (id: string): Promise<void> => providerOverrideSettings.resetItem(id),
});
