import { ArrowLeft, ArrowRight, Loader2, RotateCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@renderer/lib/ui/button';
import { Input } from '@renderer/lib/ui/input';

type UrlBarProps = {
  url: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onSubmit: (url: string) => void;
};

export function UrlBar({
  url,
  loading,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onReload,
  onSubmit,
}: UrlBarProps) {
  const [draft, setDraft] = useState(url);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync the prop into local draft when the input is unfocused. We intentionally
  // setState in this effect — typing while a navigation completes must not clobber
  // the user's draft, and there is no clean derived-state alternative here.
  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(url);
  }, [url]);

  return (
    <form
      className="flex items-center gap-1 border-b border-border bg-background-1 px-2 py-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        const normalized = normalizeUrl(draft);
        if (!normalized) return;
        onSubmit(normalized);
      }}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        disabled={!canGoBack}
        onClick={onBack}
        aria-label="Back"
      >
        <ArrowLeft className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        disabled={!canGoForward}
        onClick={onForward}
        aria-label="Forward"
      >
        <ArrowRight className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onReload}
        aria-label="Reload"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <RotateCw className="size-4" />}
      </Button>
      <Input
        ref={inputRef as never}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => setDraft(url)}
        placeholder="Enter URL or search…"
        className="h-7 flex-1 text-xs"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
      />
    </form>
  );
}

function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return trimmed;
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(trimmed)) return `https://${trimmed}`;
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}
