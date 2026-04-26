import { runInAction } from 'mobx';
import {
  ComponentType,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react';
import {
  views,
  type ViewDefinition,
  type ViewId,
  type WrapParams,
} from '@renderer/app/view-registry';
import { useModalContext } from '@renderer/lib/modal/modal-provider';
import { appState } from '@renderer/lib/stores/app-state';
import { focusTracker } from '@renderer/utils/focus-tracker';
import { clearTelemetryTaskScope, setTelemetryTaskScope } from '@renderer/utils/telemetry-scope';
import { captureTelemetry } from '@renderer/utils/telemetryClient';
import {
  WorkspaceNavigateContext,
  WorkspaceNavigationHistoryContext,
  WorkspaceSlotsContext,
  WorkspaceUpdateViewParamsContext,
  WorkspaceViewParamsStoreContext,
  WorkspaceWrapParamsContext,
  type NavigateFnTyped,
  type NavigationHistoryContextValue,
  type SlotsContextValue,
  type UpdateViewParamsFn,
  type WrapParamsContextValue,
} from './navigation-provider';

type HistoryEntry = { viewId: ViewId; params: Record<string, unknown> };

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  if (a === b) return true;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

type ViewParamsStore = Partial<{ [K in ViewId]: WrapParams<K> }>;

function syncTelemetryScope(currentViewId: ViewId, viewParamsStore: ViewParamsStore): void {
  if (currentViewId !== 'task') {
    clearTelemetryTaskScope();
    return;
  }

  const taskParams = viewParamsStore.task;
  if (
    taskParams &&
    typeof taskParams.projectId === 'string' &&
    typeof taskParams.taskId === 'string'
  ) {
    setTelemetryTaskScope({ projectId: taskParams.projectId, taskId: taskParams.taskId });
    return;
  }

  clearTelemetryTaskScope();
}

const viewEvents: Record<
  ViewId,
  | 'home_viewed'
  | 'project_viewed'
  | 'task_viewed'
  | 'settings_viewed'
  | 'skills_viewed'
  | 'mcp_viewed'
> = {
  home: 'home_viewed',
  project: 'project_viewed',
  task: 'task_viewed',
  settings: 'settings_viewed',
  skills: 'skills_viewed',
  mcp: 'mcp_viewed',
};

export function WorkspaceViewProvider({ children }: { children: ReactNode }) {
  const { closeModal } = useModalContext();
  const [currentViewId, setCurrentViewId] = useState<ViewId>(() => {
    const v = appState.navigation.currentViewId;
    return v;
  });
  const [viewParamsStore, setViewParamsStore] = useState<ViewParamsStore>(
    () => appState.navigation.viewParamsStore as ViewParamsStore
  );
  const [backStack, setBackStack] = useState<HistoryEntry[]>([]);
  const [forwardStack, setForwardStack] = useState<HistoryEntry[]>([]);
  const currentEntryRef = useRef<HistoryEntry>({
    viewId: currentViewId,
    params: (viewParamsStore[currentViewId] ?? {}) as Record<string, unknown>,
  });
  const [_, startTransition] = useTransition();

  // Sync React state back to the MobX persistence mirror after every commit.
  // The SnapshotRegistry reaction then debounces the RPC write by 1 s.
  useEffect(() => {
    runInAction(() => appState.navigation.sync(currentViewId, viewParamsStore));
    currentEntryRef.current = {
      viewId: currentViewId,
      params: (viewParamsStore[currentViewId] ?? {}) as Record<string, unknown>,
    };
  }, [currentViewId, viewParamsStore]);

  useEffect(() => {
    const initialViewId = appState.navigation.currentViewId;
    focusTracker.initialize({ view: initialViewId });
    syncTelemetryScope(initialViewId, appState.navigation.viewParamsStore as ViewParamsStore);
    captureTelemetry(viewEvents[initialViewId], { from_view: null });
  }, []);

  useEffect(() => {
    syncTelemetryScope(currentViewId, viewParamsStore);
  }, [currentViewId, viewParamsStore]);

  const applyHistoryEntry = useCallback((entry: HistoryEntry) => {
    const transition = focusTracker.transition(
      entry.viewId === 'task'
        ? { view: entry.viewId }
        : {
            view: entry.viewId,
            mainPanel: null,
            rightPanel: null,
            focusedRegion: null,
          },
      'navigation'
    );
    captureTelemetry(viewEvents[entry.viewId], {
      from_view: transition?.previous.view ?? null,
    });
    startTransition(() => {
      setCurrentViewId(entry.viewId);
      setViewParamsStore((prev) => ({ ...prev, [entry.viewId]: entry.params }));
    });
  }, []);

  const navigate = useCallback(
    (...args: unknown[]) => {
      const [viewId, params] = args as [ViewId, Record<string, unknown> | undefined];
      const current = currentEntryRef.current;
      const nextParams =
        params !== undefined
          ? params
          : ((viewParamsStore[viewId] ?? {}) as Record<string, unknown>);
      const isSame = viewId === current.viewId && shallowEqual(current.params, nextParams);
      if (isSame) {
        closeModal();
        return;
      }
      if (viewId !== currentViewId) {
        const transition = focusTracker.transition(
          viewId === 'task'
            ? { view: viewId }
            : {
                view: viewId,
                mainPanel: null,
                rightPanel: null,
                focusedRegion: null,
              },
          'navigation'
        );

        captureTelemetry(viewEvents[viewId], {
          from_view: transition?.previous.view ?? null,
        });
      }

      setBackStack((prev) => [...prev, current]);
      setForwardStack([]);

      startTransition(() => {
        setCurrentViewId(viewId);
        // Only overwrite stored params when the caller explicitly passes them;
        // navigating without params preserves whatever was stored for that view.
        if (params !== undefined) {
          setViewParamsStore((prev) => ({ ...prev, [viewId]: params }));
        }
        closeModal();
      });
    },
    [closeModal, currentViewId, viewParamsStore]
  ) as NavigateFnTyped;

  const goBack = useCallback(() => {
    if (backStack.length === 0) return;
    const target = backStack[backStack.length - 1];
    setBackStack((prev) => prev.slice(0, -1));
    setForwardStack((prev) => [...prev, currentEntryRef.current]);
    applyHistoryEntry(target);
    closeModal();
  }, [applyHistoryEntry, backStack, closeModal]);

  const goForward = useCallback(() => {
    if (forwardStack.length === 0) return;
    const target = forwardStack[forwardStack.length - 1];
    setForwardStack((prev) => prev.slice(0, -1));
    setBackStack((prev) => [...prev, currentEntryRef.current]);
    applyHistoryEntry(target);
    closeModal();
  }, [applyHistoryEntry, forwardStack, closeModal]);

  const updateViewParams = useCallback(
    <TId extends ViewId>(
      viewId: TId,
      update: Partial<WrapParams<TId>> | ((prev: WrapParams<TId>) => WrapParams<TId>)
    ) => {
      setViewParamsStore((prev) => {
        const current = (prev[viewId] ?? {}) as WrapParams<TId>;
        const next = typeof update === 'function' ? update(current) : { ...current, ...update };
        return { ...prev, [viewId]: next };
      });
    },
    []
  ) as UpdateViewParamsFn;

  const slotsValue = useMemo((): SlotsContextValue => {
    const def = (views as unknown as Record<string, ViewDefinition<Record<string, unknown>>>)[
      currentViewId
    ];
    return {
      WrapView: (def.WrapView ?? Fragment) as ComponentType<
        { children: ReactNode } & Record<string, unknown>
      >,
      TitlebarSlot: def.TitlebarSlot ?? (() => null),
      MainPanel: def.MainPanel,
      RightPanel: def.RightPanel ?? null,
      currentView: currentViewId,
    };
  }, [currentViewId]);

  const wrapParamsValue = useMemo(
    (): WrapParamsContextValue => ({
      wrapParams: (viewParamsStore[currentViewId] ?? {}) as Record<string, unknown>,
    }),
    [viewParamsStore, currentViewId]
  );

  const viewParamsStoreValue = useMemo(() => ({ viewParamsStore }), [viewParamsStore]);

  const historyValue = useMemo(
    (): NavigationHistoryContextValue => ({
      goBack,
      goForward,
      canGoBack: backStack.length > 0,
      canGoForward: forwardStack.length > 0,
    }),
    [goBack, goForward, backStack.length, forwardStack.length]
  );

  return (
    <WorkspaceNavigateContext.Provider value={navigate}>
      <WorkspaceNavigationHistoryContext.Provider value={historyValue}>
        <WorkspaceSlotsContext.Provider value={slotsValue}>
          <WorkspaceWrapParamsContext.Provider value={wrapParamsValue}>
            <WorkspaceViewParamsStoreContext.Provider value={viewParamsStoreValue}>
              <WorkspaceUpdateViewParamsContext.Provider value={updateViewParams}>
                {children}
              </WorkspaceUpdateViewParamsContext.Provider>
            </WorkspaceViewParamsStoreContext.Provider>
          </WorkspaceWrapParamsContext.Provider>
        </WorkspaceSlotsContext.Provider>
      </WorkspaceNavigationHistoryContext.Provider>
    </WorkspaceNavigateContext.Provider>
  );
}
