import { createRPCController } from '@shared/ipc/rpc';
import type { TelemetryEvent, TelemetryProperties } from '@shared/telemetry';
import { capture, getTelemetryStatus, setTelemetryEnabledViaUser } from '@main/lib/telemetry';

export const telemetryController = createRPCController({
  getStatus: () => ({ status: getTelemetryStatus() }),
  setEnabled: (enabled: boolean) => {
    setTelemetryEnabledViaUser(enabled);
  },
  capture: <E extends TelemetryEvent>(args: {
    event: E;
    properties?: TelemetryProperties<E> | Record<string, unknown>;
  }) => {
    capture(args.event, args.properties);
  },
});
