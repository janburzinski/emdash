import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { createContext, useContext } from 'react';

type SplitDragHandle = {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
  setActivatorNodeRef: (element: HTMLElement | null) => void;
};

const SplitDragHandleContext = createContext<SplitDragHandle | null>(null);

export const SplitDragHandleProvider = SplitDragHandleContext.Provider;

export function useSplitDragHandle(): SplitDragHandle | null {
  return useContext(SplitDragHandleContext);
}
