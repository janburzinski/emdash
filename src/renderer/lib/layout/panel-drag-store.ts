/**
 * Tiny external store for panel-drag and panel-animation state, compatible
 * with useSyncExternalStore.
 *
 * Two independent inputs collapse into one "suppress fits" snapshot:
 *   - dragging:  true while the user is actively dragging a Separator
 *                (written by layout-provider.tsx > handleDragging)
 *   - animating: true while a programmatic toggle (collapse/expand) is
 *                playing its CSS flex-grow transition
 *                (written by layout-provider.tsx > setCollapsed)
 *
 * `getSnapshot()` returns `dragging || animating` — the combined signal
 * use-pty.ts subscribes to so terminals skip fitAddon.fit() during either,
 * then fire exactly one fit when both clear.
 *
 * `getDraggingSnapshot()` returns only `dragging` — used by resizable.tsx to
 * disable the CSS flex-grow transition during real pointer drags (where the
 * panel must follow the cursor 1:1) without disabling it during programmatic
 * toggles (where the transition is exactly what we want).
 */

type Listener = () => void;

let isDragging = false;
let isAnimating = false;
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  return isDragging || isAnimating;
}

function getDraggingSnapshot(): boolean {
  return isDragging;
}

function setDragging(value: boolean): void {
  if (isDragging === value) return;
  isDragging = value;
  emit();
}

function setAnimating(value: boolean): void {
  if (isAnimating === value) return;
  isAnimating = value;
  emit();
}

export const panelDragStore = {
  subscribe,
  getSnapshot,
  getDraggingSnapshot,
  setDragging,
  setAnimating,
};
