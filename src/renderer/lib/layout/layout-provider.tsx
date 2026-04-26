import {
  createContext,
  ReactNode,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { usePanelRef, type PanelImperativeHandle } from 'react-resizable-panels';
import { panelDragStore } from './panel-drag-store';

// Matches the CSS `flex-grow` transition on [data-panel] in index.css plus a
// small buffer for the final layout frame. While the animation runs we
// piggy-back on panelDragStore so xterm's ResizeObserver suppresses fits
// (otherwise terminals flicker as they re-fit on every animation frame).
const COLLAPSE_ANIMATION_MS = 260;

export interface WorkspaceLayoutContextValue {
  isLeftOpen: boolean;
  isRightOpen: boolean;
  leftPanelRef: RefObject<PanelImperativeHandle | null>;
  rightPanelRef: RefObject<PanelImperativeHandle | null>;
  setIsLeftOpen: (open: boolean) => void;
  setIsRightOpen: (open: boolean) => void;
  handleDragging: (side: 'left' | 'right', dragging: boolean) => void;
  setCollapsed: (side: 'left' | 'right', collapsed: boolean) => void;
  toggleLeft: () => void;
  toggleRight: () => void;
}

const WorkspaceLayoutContext = createContext<WorkspaceLayoutContextValue | undefined>(undefined);

export function useWorkspaceLayoutService() {
  const leftPanelRef = usePanelRef();
  const rightPanelRef = usePanelRef();

  const [isLeftOpen, setIsLeftOpen] = useState(true);
  const [isRightOpen, setIsRightOpen] = useState(true);

  const draggingRef = useRef({ left: false, right: false });
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDragging = useCallback((side: 'left' | 'right', dragging: boolean) => {
    if (draggingRef.current[side] === dragging) return;
    const wasDragging = draggingRef.current.left || draggingRef.current.right;
    draggingRef.current[side] = dragging;
    const isDragging = draggingRef.current.left || draggingRef.current.right;
    if (wasDragging !== isDragging) {
      panelDragStore.setDragging(isDragging);
    }
  }, []);

  useEffect(() => {
    const dragging = draggingRef.current;
    const animationTimer = animationTimerRef;
    return () => {
      if (animationTimer.current) {
        clearTimeout(animationTimer.current);
        animationTimer.current = null;
      }
      if (dragging.left || dragging.right) {
        panelDragStore.setDragging(false);
      }
      panelDragStore.setAnimating(false);
    };
  }, []);

  const setCollapsed = useCallback(
    (side: 'left' | 'right', collapsed: boolean) => {
      const panel = side === 'left' ? leftPanelRef.current : rightPanelRef.current;
      if (!panel) return;

      // Mark the toggle as "animating" so the PTY ResizeObserver suppresses
      // per-frame fits during the CSS flex-grow transition. This does NOT
      // disable the transition itself — that's gated on real pointer drags
      // only via getDraggingSnapshot in resizable.tsx.
      panelDragStore.setAnimating(true);

      if (collapsed) {
        panel.collapse();
      } else {
        panel.expand();
      }

      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
      animationTimerRef.current = setTimeout(() => {
        animationTimerRef.current = null;
        panelDragStore.setAnimating(false);
      }, COLLAPSE_ANIMATION_MS);
    },
    [leftPanelRef, rightPanelRef]
  );

  const toggleLeft = useCallback(() => {
    setCollapsed('left', isLeftOpen);
  }, [setCollapsed, isLeftOpen]);

  const toggleRight = useCallback(() => {
    setCollapsed('right', isRightOpen);
  }, [setCollapsed, isRightOpen]);

  return {
    leftPanelRef,
    rightPanelRef,
    handleDragging,
    setIsLeftOpen,
    setIsRightOpen,
    isLeftOpen,
    isRightOpen,
    setCollapsed,
    toggleLeft,
    toggleRight,
  };
}

export function WorkspaceLayoutContextProvider({ children }: { children: ReactNode }) {
  const value = useWorkspaceLayoutService();
  return (
    <WorkspaceLayoutContext.Provider value={value}>{children}</WorkspaceLayoutContext.Provider>
  );
}

export function useWorkspaceLayoutContext() {
  const context = useContext(WorkspaceLayoutContext);
  if (!context) {
    throw new Error(
      'useWorkspaceLayoutContext must be used within a WorkspaceLayoutContextProvider'
    );
  }
  return context;
}
