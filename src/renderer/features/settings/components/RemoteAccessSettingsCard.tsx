import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import type { RemoteServerStatus } from '@shared/remote';
import { useAppSettingsKey } from '@renderer/features/settings/use-app-settings-key';
import { useToast } from '@renderer/lib/hooks/use-toast';
import { rpc } from '@renderer/lib/ipc';
import { Input } from '@renderer/lib/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/lib/ui/select';
import { Switch } from '@renderer/lib/ui/switch';
import { SettingRow } from './SettingRow';

const REMOTE_STATUS_QUERY_KEY = ['remote', 'status'] as const;

const RemoteAccessSettingsCard: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    value: remote,
    update,
    isLoading: settingsLoading,
    isSaving,
  } = useAppSettingsKey('remote');

  const { data: status } = useQuery<RemoteServerStatus>({
    queryKey: REMOTE_STATUS_QUERY_KEY,
    queryFn: () => rpc.remote.getStatus() as Promise<RemoteServerStatus>,
    refetchInterval: 5000,
  });

  const [portInput, setPortInput] = useState<string>('');
  const [portInputDirty, setPortInputDirty] = useState(false);
  const [toggleBusy, setToggleBusy] = useState(false);

  const port = remote?.port ?? 7798;
  const bindAddress = remote?.bindAddress ?? '127.0.0.1';
  const enabled = remote?.enabled ?? false;
  const portValue = portInputDirty ? portInput : String(port);

  const commitPort = useCallback(
    (raw: string) => {
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 65535) {
        toast({
          title: 'Invalid port',
          description: 'Enter a number between 1 and 65535.',
          variant: 'destructive',
        });
        setPortInput(String(port));
        return;
      }
      if (parsed !== port) {
        update({ port: parsed });
      }
      setPortInputDirty(false);
    },
    [port, toast, update]
  );

  const setBindAddress = useCallback(
    (next: string) => {
      update({ bindAddress: next });
    },
    [update]
  );

  const toggleEnabled = useCallback(
    async (next: boolean) => {
      setToggleBusy(true);
      try {
        const result = await rpc.remote.setEnabled(next);
        if (!result.success) {
          toast({
            title: 'Could not start remote server',
            description: result.error.message ?? 'Unknown error',
            variant: 'destructive',
          });
          return;
        }
        // Update the persisted setting cache too — setEnabled writes the toggle
        // server-side but the local React Query cache lives on the renderer.
        update({ enabled: next });
        queryClient.setQueryData<RemoteServerStatus>(REMOTE_STATUS_QUERY_KEY, result.data);
      } finally {
        setToggleBusy(false);
      }
    },
    [queryClient, toast, update]
  );

  const baseUrl = status?.baseUrl ?? null;
  const running = status?.running === true;
  const disabled = settingsLoading || isSaving || toggleBusy;

  return (
    <div className="flex flex-col gap-4">
      <SettingRow
        title="Remote access"
        description="Run an embedded HTTP + WebSocket server so you can open shared tasks from any browser."
        control={
          <>
            {toggleBusy && <Loader2 className="mr-1 size-3.5 animate-spin text-foreground-muted" />}
            <Switch
              checked={enabled}
              disabled={disabled}
              onCheckedChange={(next) => void toggleEnabled(next)}
            />
          </>
        }
      />

      {enabled && (
        <>
          <SettingRow
            title="Bind address"
            description={
              bindAddress === '127.0.0.1'
                ? 'Local-only — only this machine can reach the server.'
                : 'LAN/Tailscale — the server is reachable on every interface.'
            }
            control={
              <Select
                value={bindAddress}
                disabled={disabled}
                onValueChange={(next) => {
                  if (typeof next === 'string') setBindAddress(next);
                }}
              >
                <SelectTrigger className="w-[183px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="127.0.0.1">127.0.0.1 (local only)</SelectItem>
                  <SelectItem value="0.0.0.0">0.0.0.0 (all interfaces)</SelectItem>
                </SelectContent>
              </Select>
            }
          />

          <SettingRow
            title="Port"
            description="TCP port the server listens on. Restart the server (toggle off + on) to apply changes."
            control={
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={65535}
                disabled={disabled}
                value={portValue}
                onChange={(e) => {
                  setPortInput(e.target.value);
                  setPortInputDirty(true);
                }}
                onBlur={() => commitPort(portValue)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitPort(portValue);
                }}
                className="h-9 w-[183px]"
              />
            }
          />

          <SettingRow
            title="Status"
            description={
              running
                ? `Listening at ${baseUrl ?? `${bindAddress}:${port}`}`
                : 'Server is not running.'
            }
            control={
              <span
                className={
                  running
                    ? 'text-xs font-medium text-emerald-600 dark:text-emerald-400'
                    : 'text-xs font-medium text-foreground-passive'
                }
              >
                {running ? 'Running' : 'Stopped'}
              </span>
            }
          />
        </>
      )}
    </div>
  );
};

export default RemoteAccessSettingsCard;
