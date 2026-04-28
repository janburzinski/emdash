import { Code2, Image as ImageIcon, Quote, Trash2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { Button } from '@renderer/lib/ui/button';
import { Textarea } from '@renderer/lib/ui/textarea';
import { browserStore } from '../store/browser-store';
import type { Annotation } from '../types';

type AnnotationItemProps = {
  index: number;
  annotation: Annotation;
};

export const AnnotationItem = observer(function AnnotationItem({
  index,
  annotation,
}: AnnotationItemProps) {
  return (
    <div className="rounded-md border border-border bg-background-1 p-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
          <span className="font-mono text-[10px]">[{index}]</span>
          <KindIcon kind={annotation.kind} />
          <span className="truncate" title={annotation.url}>
            {hostname(annotation.url)}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => browserStore.removeAnnotation(annotation.id)}
          aria-label="Remove annotation"
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
      <AnnotationPreview annotation={annotation} />
      <Textarea
        value={annotation.note}
        onChange={(e) => browserStore.updateNote(annotation.id, e.target.value)}
        placeholder="Add a note for the agent (optional)…"
        className="mt-1.5 min-h-0 text-xs"
        rows={2}
      />
    </div>
  );
});

function KindIcon({ kind }: { kind: Annotation['kind'] }) {
  if (kind === 'element') return <Code2 className="size-3" />;
  if (kind === 'text') return <Quote className="size-3" />;
  return <ImageIcon className="size-3" />;
}

function AnnotationPreview({ annotation }: { annotation: Annotation }) {
  if (annotation.kind === 'element') {
    return (
      <div className="space-y-1">
        <div
          className="font-mono text-[11px] text-foreground-muted truncate"
          title={annotation.selector}
        >
          {annotation.selector}
        </div>
        {annotation.text ? (
          <div className="text-xs text-foreground line-clamp-2">{annotation.text}</div>
        ) : null}
      </div>
    );
  }
  if (annotation.kind === 'text') {
    return (
      <div className="border-l-2 border-border pl-2 text-xs text-foreground line-clamp-3">
        {annotation.text}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded border border-border">
      <img
        src={annotation.dataUrl}
        alt="Annotated region"
        className="block max-h-32 w-full object-contain bg-background"
      />
    </div>
  );
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
