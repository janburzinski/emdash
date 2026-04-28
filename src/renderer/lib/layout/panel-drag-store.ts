type Listener = () => void;

let isDragging = false;
const listeners = new Set<Listener>();

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  return isDragging;
}

function setDragging(value: boolean): void {
  if (isDragging === value) return;
  isDragging = value;
  for (const listener of listeners) listener();
}

export const panelDragStore = { subscribe, getSnapshot, setDragging };
