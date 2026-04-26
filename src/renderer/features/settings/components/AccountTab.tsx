import { SignIn as LogIn, SignOut as LogOut, User } from '@phosphor-icons/react';
import { useState } from 'react';
import { useToast } from '@renderer/lib/hooks/use-toast';
import {
  useAccountHealth,
  useAccountSession,
  useAccountSignIn,
  useAccountSignOut,
} from '@renderer/lib/hooks/useAccount';
import { Button } from '@renderer/lib/ui/button';
import { ServerUnavailableMessage } from './ServerUnavailableMessage';
import { SettingsCard } from './SettingsCard';

export function AccountTab() {
  const { data: session, isLoading } = useAccountSession();
  const { data: serverAvailable } = useAccountHealth();
  const signInMutation = useAccountSignIn();
  const signOutMutation = useAccountSignOut();
  const { toast } = useToast();

  const [error, setError] = useState<string | null>(null);

  const user = session?.user ?? null;
  const isSignedIn = session?.isSignedIn ?? false;
  const hasAccount = session?.hasAccount ?? false;

  const handleSignIn = async () => {
    setError(null);
    try {
      const result = await signInMutation.mutateAsync(undefined);
      if (!result.success) {
        const message = result.error || 'Sign in failed';
        setError(message);
        toast({
          title: 'Sign in failed',
          description: message,
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Signed in to Emdash',
        description: result.user ? `Connected as @${result.user.username}` : 'Signed in',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      setError(message);
      toast({
        title: 'Sign in failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleSignOut = async () => {
    await signOutMutation.mutateAsync();
  };

  if (isLoading) {
    return (
      <SettingsCard flush>
        <div className="flex items-center justify-center px-4 py-10 text-sm text-foreground-passive">
          Loading account…
        </div>
      </SettingsCard>
    );
  }

  if (isSignedIn && user) {
    return (
      <SettingsCard flush>
        <div className="flex items-center gap-4 px-4 py-4">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.username}
              className="h-10 w-10 rounded-full border border-border/60"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-muted">
              <User className="h-5 w-5 text-foreground-muted" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm text-foreground">
              Connected as <span className="font-medium">@{user.username}</span>
            </p>
            {user.email && <p className="truncate text-xs text-foreground-passive">{user.email}</p>}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            disabled={signOutMutation.isPending}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </Button>
        </div>
      </SettingsCard>
    );
  }

  if (hasAccount && !isSignedIn) {
    return (
      <SettingsCard flush>
        <div className="flex flex-col gap-3 px-4 py-4">
          <div>
            <p className="text-sm text-foreground">Session expired</p>
            <p className="text-xs text-foreground-passive">
              Sign in again to reconnect your Emdash account.
            </p>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {serverAvailable === false ? (
            <ServerUnavailableMessage />
          ) : (
            <Button
              type="button"
              size="sm"
              className="w-fit"
              onClick={handleSignIn}
              disabled={signInMutation.isPending}
            >
              <LogIn className="h-3.5 w-3.5" />
              {signInMutation.isPending ? 'Signing in…' : 'Sign In'}
            </Button>
          )}
        </div>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard flush>
      <div className="flex flex-col gap-3 px-4 py-4">
        <div>
          <p className="text-sm text-foreground">Emdash Account</p>
          <p className="text-xs text-foreground-passive">
            Create an Emdash account to automatically connect GitHub using OAuth2.
          </p>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {serverAvailable === false ? (
          <ServerUnavailableMessage />
        ) : (
          <Button
            type="button"
            size="sm"
            className="w-fit"
            onClick={handleSignIn}
            disabled={signInMutation.isPending}
          >
            <LogIn className="h-3.5 w-3.5" />
            {signInMutation.isPending ? 'Creating account…' : 'Create Account'}
          </Button>
        )}
      </div>
    </SettingsCard>
  );
}
