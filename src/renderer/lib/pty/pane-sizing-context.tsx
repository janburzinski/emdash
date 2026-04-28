import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { rpc } from '@renderer/lib/ipc';
import { measureDimensions, type TerminalDimensions } from './pty-dimensions';

const PTY_RESIZE_DEBOUNCE_MS = 60;
const MIN_TERMINAL_COLS = 2;
const MIN_TERMINAL_ROWS = 1;

// Maps paneId → the provider's container HTMLDivElement.  Survives renders and
// is accessible from anywhere in the renderer process (e.g. sidebar hover
// handlers, cross-pane coordinators).
const paneRegistry = new Map<string, HTMLDivElement>();

export function getPaneContainer(paneId: string): HTMLDivElement | null {
  return paneRegistry.get(paneId) ?? null;
}

export interface PaneSizingContextValue {
  reportDimensions: (cols: number, rows: number) => void;
  getCurrentDimensions: () => { cols: number; rows: number } | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  measureCurrentDimensions: (cellWidth: number, cellHeight: number) => TerminalDimensions | null;
}

const PaneSizingContext = createContext<PaneSizingContextValue | null>(null);

export function usePaneSizingContext(): PaneSizingContextValue | null {
  return useContext(PaneSizingContext);
}

interface PaneSizingProviderProps {
  /** Stable identifier for this pane.  Used to register in the module-level
   *  paneRegistry so code outside the React tree can measure this pane. */
  paneId: string;
  sessionIds: string[];
  children: ReactNode;
}

export function PaneSizingProvider({ paneId, sessionIds, children }: PaneSizingProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionsRef = useRef<string[]>([]);
  const lastDimensionsRef = useRef<{ cols: number; rows: number } | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDimsRef = useRef<{ cols: number; rows: number } | null>(null);

  // Register/unregister this pane in the module-level registry.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    paneRegistry.set(paneId, el);
    return () => {
      paneRegistry.delete(paneId);
    };
  }, [paneId]);

  // When sessionIds change, send the current known dimensions to any sessions
  // that are newly added (e.g. a conversation was just created).
  useEffect(() => {
    const prev = sessionsRef.current;
    const added = sessionIds.filter((id) => !prev.includes(id));
    sessionsRef.current = sessionIds;
    const dims = lastDimensionsRef.current;
    if (dims && added.length > 0) {
      for (const id of added) {
        rpc.pty.resize(id, dims.cols, dims.rows);
      }
    }
  }, [sessionIds]);

  // Clear debounce timer on unmount.
  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
      }
    };
  }, []);

  const flush = useCallback(() => {
    const dims = pendingDimsRef.current;
    pendingDimsRef.current = null;
    if (!dims) return;
    lastDimensionsRef.current = dims;
    for (const id of sessionsRef.current) {
      rpc.pty.resize(id, dims.cols, dims.rows);
    }
  }, []);

  const reportDimensions = useCallback(
    (cols: number, rows: number) => {
      const c = Math.max(MIN_TERMINAL_COLS, cols);
      const r = Math.max(MIN_TERMINAL_ROWS, rows);
      // No dedup here: a newly active session's PTY may not have received the
      // resize yet even if the pane dimensions are unchanged, so we always
      // broadcast.  The debounce timer coalesces rapid calls.
      pendingDimsRef.current = { cols: c, rows: r };
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = setTimeout(() => {
        pendingTimerRef.current = null;
        flush();
      }, PTY_RESIZE_DEBOUNCE_MS);
    },
    [flush]
  );

  const getCurrentDimensions = useCallback(
    (): { cols: number; rows: number } | null => lastDimensionsRef.current,
    []
  );

  const measureCurrentDimensions = useCallback(
    (cellWidth: number, cellHeight: number): TerminalDimensions | null => {
      const el = containerRef.current;
      if (!el) return null;
      return measureDimensions(el, cellWidth, cellHeight);
    },
    []
  );

  const value = useMemo(
    () => ({ reportDimensions, getCurrentDimensions, containerRef, measureCurrentDimensions }),
    [reportDimensions, getCurrentDimensions, measureCurrentDimensions]
  );

  return (
    <PaneSizingContext.Provider value={value}>
      <div ref={containerRef} className="flex min-h-0 flex-1 flex-col">
        {children}
      </div>
    </PaneSizingContext.Provider>
  );
}
