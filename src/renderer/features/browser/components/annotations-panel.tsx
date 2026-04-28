import { ArrowUp, MousePointerClick, Square, TextCursor, Trash } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { Button } from '@renderer/lib/ui/button';
import { getActiveTaskTarget, sendAnnotationsToActiveTask } from '../inject';
import { browserStore } from '../store/browser-store';
import type { BrowserMode } from '../types';
import { AnnotationItem } from './annotation-item';

const MODE_BUTTONS: Array<{
  mode: Exclude<BrowserMode, 'idle'>;
  label: string;
  Icon: typeof MousePointerClick;
}> = [
  { mode: 'pick', label: 'Pick element', Icon: MousePointerClick },
  { mode: 'select', label: 'Select text', Icon: TextCursor },
  { mode: 'region', label: 'Region', Icon: Square },
];

export const BrowserAnnotationsPanel = observer(function BrowserAnnotationsPanel() {
  const annotations = browserStore.annotations;
  const mode = browserStore.mode;
  const target = getActiveTaskTarget();
  const sendLabel = target?.taskName
    ? `Send to ${target.taskName}`
    : target
      ? 'Send to active task'
      : 'No active task';

  return (
    <div className="flex h-full w-full flex-col border-l border-border bg-background">
      <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-2">
        <span className="text-xs font-medium text-foreground">Annotations</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => browserStore.clearAll()}
          disabled={annotations.length === 0}
          aria-label="Clear all annotations"
          title="Clear all"
        >
          <Trash className="size-3" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border px-2 py-1.5">
        {MODE_BUTTONS.map(({ mode: m, label, Icon }) => {
          const active = mode === m;
          return (
            <Button
              key={m}
              type="button"
              variant={active ? 'default' : 'outline'}
              size="xs"
              onClick={() => browserStore.setMode(active ? 'idle' : m)}
              className="text-xs"
            >
              <Icon className="size-3" />
              <span>{label}</span>
            </Button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
        {annotations.length === 0 ? (
          <EmptyState />
        ) : (
          annotations.map((annotation, idx) => (
            <AnnotationItem key={annotation.id} index={idx + 1} annotation={annotation} />
          ))
        )}
      </div>

      <div className="border-t border-border p-2">
        <Button
          type="button"
          variant="default"
          size="sm"
          className="w-full"
          disabled={annotations.length === 0 || !target}
          onClick={() => void sendAnnotationsToActiveTask(annotations)}
        >
          <ArrowUp className="size-3.5" />
          <span className="truncate">{sendLabel}</span>
        </Button>
      </div>
    </div>
  );
});

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center">
      <p className="text-xs text-foreground-muted">
        Pick an element, select text, or drag a region on the page to start collecting context.
      </p>
    </div>
  );
}
