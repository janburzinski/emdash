import { ArrowLeft, ChevronRight, File as FileIcon, Folder, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { rpc } from '@renderer/lib/ipc';
import { type BaseModalProps } from '@renderer/lib/modal/modal-provider';
import { Button } from '@renderer/lib/ui/button';
import {
  DialogContentArea,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/lib/ui/dialog';
import { Spinner } from '@renderer/lib/ui/spinner';
import { cn } from '@renderer/utils/utils';

export type FilePickerMode = 'directory' | 'file';

export interface FilePickerModalProps extends BaseModalProps<string> {
  mode: FilePickerMode;
  title?: string;
  initialPath?: string;
  extensions?: string[];
  showHidden?: boolean;
}

type PickerEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
  isHidden: boolean;
  isSymlink: boolean;
  size?: number;
  mtimeMs?: number;
};

type Segment = { name: string; path: string };

export function FilePickerModal({
  mode,
  title,
  initialPath,
  extensions,
  showHidden = false,
  onSuccess,
  onClose,
}: FilePickerModalProps) {
  const [currentPath, setCurrentPath] = useState<string>(initialPath || '~');
  const [entries, setEntries] = useState<PickerEntry[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [parent, setParent] = useState<string | null>(null);
  const [resolvedPath, setResolvedPath] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const reqIdRef = useRef(0);

  const browse = useCallback(
    async (target: string) => {
      const reqId = ++reqIdRef.current;
      setIsLoading(true);
      setError(null);
      try {
        const result = await rpc.app.browseHostDirectory({
          dirPath: target,
          showHidden,
          mode: mode === 'directory' ? 'directory' : 'all',
          extensions: mode === 'file' ? extensions : undefined,
        });
        if (reqId !== reqIdRef.current) return;
        if (!result.success) {
          setError(result.error);
          setEntries([]);
          setSegments([]);
          setParent(null);
          return;
        }
        setEntries(result.data.entries);
        setSegments(result.data.segments);
        setParent(result.data.parent);
        setResolvedPath(result.data.path);
        setHighlightIndex(0);
        setFilter('');
      } catch (err) {
        if (reqId !== reqIdRef.current) return;
        setError(err instanceof Error ? err.message : 'Failed to read directory');
      } finally {
        if (reqId === reqIdRef.current) setIsLoading(false);
      }
    },
    [extensions, mode, showHidden]
  );

  useEffect(() => {
    void browse(currentPath);
  }, [currentPath, browse]);

  const filteredEntries = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.name.toLowerCase().includes(q));
  }, [entries, filter]);

  useEffect(() => {
    if (highlightIndex >= filteredEntries.length) {
      setHighlightIndex(Math.max(0, filteredEntries.length - 1));
    }
  }, [filteredEntries.length, highlightIndex]);

  const isSelectable = useCallback(
    (entry: PickerEntry) => (mode === 'directory' ? entry.isDirectory : !entry.isDirectory),
    [mode]
  );

  const canSelectCurrentDirectory = mode === 'directory' && !!resolvedPath;

  const navigateInto = useCallback((entryPath: string) => {
    setCurrentPath(entryPath);
  }, []);

  const goUp = useCallback(() => {
    if (parent) setCurrentPath(parent);
  }, [parent]);

  const handleEntrySelect = useCallback(
    (entry: PickerEntry) => {
      if (entry.isDirectory) {
        navigateInto(entry.path);
        return;
      }
      if (mode === 'file') {
        onSuccess(entry.path);
      }
    },
    [mode, navigateInto, onSuccess]
  );

  const confirmCurrent = useCallback(() => {
    if (!canSelectCurrentDirectory || !resolvedPath) return;
    onSuccess(resolvedPath);
  }, [canSelectCurrentDirectory, onSuccess, resolvedPath]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-picker-index="${highlightIndex}"]`
    );
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(filteredEntries.length - 1, i + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === 'Enter') {
        if (e.metaKey || e.ctrlKey) {
          if (canSelectCurrentDirectory) {
            e.preventDefault();
            confirmCurrent();
          }
          return;
        }
        e.preventDefault();
        const entry = filteredEntries[highlightIndex];
        if (entry) handleEntrySelect(entry);
        return;
      }
      if (e.key === 'Backspace' && !filter) {
        if (parent) {
          e.preventDefault();
          goUp();
        }
      }
    },
    [
      canSelectCurrentDirectory,
      confirmCurrent,
      filter,
      filteredEntries,
      goUp,
      handleEntrySelect,
      highlightIndex,
      parent,
    ]
  );

  const visibleSegments = useMemo<Segment[]>(() => {
    if (segments.length <= 4) return segments;
    return [segments[0], { name: '…', path: '' }, ...segments.slice(-3)];
  }, [segments]);

  return (
    <div onKeyDown={handleKeyDown}>
      <DialogHeader>
        <DialogTitle>
          {title || (mode === 'directory' ? 'Select Folder' : 'Select File')}
        </DialogTitle>
      </DialogHeader>

      <div className="flex items-center gap-1 px-6 pb-3 overflow-hidden">
        {visibleSegments.map((seg, idx) => {
          const isLast = idx === visibleSegments.length - 1;
          const isEllipsis = seg.path === '';
          return (
            <div key={`${seg.path}-${idx}`} className="flex items-center gap-1 min-w-0">
              {idx > 0 && (
                <ChevronRight className="size-3 shrink-0 text-foreground-tertiary-muted" />
              )}
              {isEllipsis ? (
                <span className="text-xs text-foreground-tertiary-muted">…</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrentPath(seg.path)}
                  className={cn(
                    'truncate rounded px-1 py-0.5 text-xs transition-colors hover:bg-background-quaternary-1',
                    isLast ? 'font-medium text-foreground' : 'text-foreground-tertiary'
                  )}
                >
                  {seg.name === '/' ? 'Root' : seg.name}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 border-y border-border bg-background-quaternary-1 px-4">
        <Search className="size-4 shrink-0 text-foreground-tertiary-muted" />
        <input
          autoFocus
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setHighlightIndex(0);
          }}
          placeholder={mode === 'directory' ? 'Filter folders…' : 'Filter files…'}
          className="h-10 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-passive"
        />
        {isLoading && <Spinner size="sm" className="text-foreground-tertiary-muted" />}
      </div>

      <DialogContentArea className="p-0 pt-0">
        <div ref={listRef} className="h-[55vh] overflow-y-auto p-2">
          {error && <div className="px-3 py-6 text-center text-sm text-destructive">{error}</div>}
          {!error && filteredEntries.length === 0 && !isLoading && (
            <div className="px-3 py-12 text-center text-sm text-foreground-tertiary-muted">
              {filter ? 'No matches.' : 'This folder is empty.'}
            </div>
          )}
          {parent && !filter && (
            <button
              type="button"
              onClick={goUp}
              className="mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-foreground-tertiary transition-colors hover:bg-background-quaternary-1 hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              <span className="truncate">.. (parent directory)</span>
            </button>
          )}
          {filteredEntries.map((entry, idx) => {
            const selectable = isSelectable(entry);
            const isHighlighted = idx === highlightIndex;
            return (
              <button
                type="button"
                key={entry.path}
                data-picker-index={idx}
                onMouseEnter={() => setHighlightIndex(idx)}
                onClick={() => handleEntrySelect(entry)}
                onDoubleClick={() => {
                  if (entry.isDirectory) navigateInto(entry.path);
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                  isHighlighted
                    ? 'bg-background-quaternary-2 text-foreground'
                    : 'text-foreground hover:bg-background-quaternary-1',
                  !selectable && 'opacity-50'
                )}
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-background-quaternary-2 text-foreground-tertiary">
                  {entry.isDirectory ? (
                    <Folder className="size-4" />
                  ) : (
                    <FileIcon className="size-4" />
                  )}
                </div>
                <span className="min-w-0 flex-1 truncate">
                  {entry.name}
                  {entry.isHidden && (
                    <span className="ml-1.5 text-xs text-foreground-tertiary-muted">hidden</span>
                  )}
                </span>
                {entry.isDirectory && (
                  <ChevronRight className="size-3.5 shrink-0 text-foreground-tertiary-muted" />
                )}
              </button>
            );
          })}
        </div>
      </DialogContentArea>

      <DialogFooter className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        {mode === 'directory' && (
          <Button size="sm" onClick={confirmCurrent} disabled={!canSelectCurrentDirectory}>
            Select
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}
