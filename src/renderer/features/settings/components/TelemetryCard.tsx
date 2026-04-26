import React from 'react';
import { PRODUCT_NAME } from '@shared/app-identity';
import { useTelemetryConsent } from '@renderer/lib/hooks/useTelemetryConsent';
import { rpc } from '@renderer/lib/ipc';
import { Switch } from '@renderer/lib/ui/switch';
import { SettingRow } from './SettingRow';

const TelemetryCard: React.FC = () => {
  const { prefEnabled, envDisabled, hasKeyAndHost, loading, setTelemetryEnabled } =
    useTelemetryConsent();

  return (
    <SettingRow
      title="Anonymous telemetry"
      description={
        <span>
          Help improve {PRODUCT_NAME} by sending anonymous usage data.{' '}
          <button
            type="button"
            className="inline-flex items-center gap-0.5 text-foreground-muted underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => rpc.app.openExternal('https://docs.emdash.sh/telemetry')}
          >
            Learn more
            <span aria-hidden>↗</span>
          </button>
        </span>
      }
      control={
        <div className="flex flex-col items-end gap-1">
          <Switch
            checked={prefEnabled}
            onCheckedChange={async (checked) => {
              void import('../../../utils/telemetryClient').then(({ captureTelemetry }) => {
                captureTelemetry('setting_changed', { setting: 'telemetry' });
              });
              void setTelemetryEnabled(checked);
            }}
            disabled={loading || envDisabled}
            aria-label="Enable anonymous telemetry"
          />
          {!hasKeyAndHost && (
            <span className="text-[10px] text-foreground-passive">Inactive in this build</span>
          )}
        </div>
      }
    />
  );
};

export default TelemetryCard;
