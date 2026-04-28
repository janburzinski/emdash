import { Check, Copy, ExternalLink, Loader2, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { RemoteServerStatus, RemoteShareCreated, RemoteShareSummary } from '@shared/remote';
import { useToast } from '@renderer/lib/hooks/use-toast';
import { rpc } from '@renderer/lib/ipc';
import type { BaseModalProps } from '@renderer/lib/modal/modal-provider';
import { Button } from '@renderer/lib/ui/button';
import {
  DialogContentArea,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/lib/ui/dialog';
import { Input } from '@renderer/lib/ui/input';
import { Spinner } from '@renderer/lib/ui/spinner';

type ShareTaskModalArgs = {
  taskId: string;
  taskName: string;
};

type Props = BaseModalProps<void> & ShareTaskModalArgs;

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'absolute';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

export function ShareTaskModal({ taskId, taskName, onClose }: Props) {
  const { toast } = useToast();
  const [status, setStatus] = useState<RemoteServerStatus | null>(null);
  const [shares, setShares] = useState<RemoteShareSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<RemoteShareCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const [startingServer, setStartingServer] = useState(false);

  const refresh = useCallback(async () => {
    const [s, list] = await Promise.all([
      rpc.remote.getStatus() as Promise<RemoteServerStatus>,
      rpc.remote.listSharesForTask(taskId) as Promise<RemoteShareSummary[]>,
    ]);
    setStatus(s);
    setShares(list);
  }, [taskId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enableServer = useCallback(async () => {
    setStartingServer(true);
    try {
      const result = await rpc.remote.setEnabled(true);
      if (!result.success) {
        toast({
          title: 'Could not start remote server',
          description: result.error.message ?? 'Unknown error',
          variant: 'destructive',
        });
        return;
      }
      setStatus(result.data);
    } finally {
      setStartingServer(false);
    }
  }, [toast]);

  const createShare = useCallback(async () => {
    setCreating(true);
    try {
      const share = (await rpc.remote.createShareForTask({ taskId })) as RemoteShareCreated;
      setCreated(share);
      await refresh();
    } catch (e) {
      toast({
        title: 'Failed to create share',
        description: e instanceof Error ? e.message : String(e),
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  }, [taskId, refresh, toast]);

  const revoke = useCallback(
    async (id: string) => {
      await rpc.remote.revokeShare(id);
      if (created?.id === id) setCreated(null);
      await refresh();
    },
    [created, refresh]
  );

  const handleCopy = useCallback(async (text: string) => {
    try {
      await copyText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignored
    }
  }, []);

  const serverEnabled = status?.enabled === true && status?.running === true;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Share task</DialogTitle>
      </DialogHeader>
      <DialogContentArea className="flex flex-col gap-4 pt-0">
        <p className="text-sm text-foreground-muted">
          Generate a link to access <span className="font-medium">{taskName}</span> — including all
          its agents and terminals — from any device on your network.
        </p>

        {!status ? (
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <Spinner className="size-3.5" /> Loading status…
          </div>
        ) : !serverEnabled ? (
          <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm">
            <div className="font-medium">Remote access is off</div>
            <p className="mt-1 text-foreground-muted">
              Turn on the remote server to start generating share links. You can configure the bind
              address and port in Settings → Interface.
            </p>
            <Button
              size="sm"
              className="mt-3"
              onClick={() => void enableServer()}
              disabled={startingServer}
            >
              {startingServer ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Starting…
                </>
              ) : (
                'Enable remote access'
              )}
            </Button>
          </div>
        ) : (
          <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-foreground-muted">
            Server running on <span className="font-mono">{status.baseUrl}</span>
          </div>
        )}

        {created && (
          <div className="flex flex-col gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Link ready
            </div>
            <p className="text-xs text-foreground-muted">
              Copy this link now — the token cannot be re-displayed.
            </p>
            <div className="flex items-center gap-2">
              <Input readOnly value={created.url} className="h-8 font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => void handleCopy(created.url)}
                aria-label="Copy share link"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => void rpc.app.openExternal(created.url)}
                aria-label="Open in browser"
              >
                <ExternalLink className="size-3.5" />
              </Button>
            </div>
          </div>
        )}

        {shares && shares.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-xs font-medium uppercase tracking-wide text-foreground-passive">
              Active shares
            </div>
            <div className="flex flex-col gap-1">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">
                      {share.label ?? `Share ending …${share.tokenSuffix}`}
                    </span>
                    <span className="text-xs text-foreground-passive">
                      Created {new Date(share.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-foreground-muted hover:text-destructive"
                    onClick={() => void revoke(share.id)}
                    aria-label="Revoke share"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContentArea>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button onClick={() => void createShare()} disabled={!serverEnabled || creating}>
          {creating ? (
            <>
              <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Creating…
            </>
          ) : (
            'Create share link'
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
