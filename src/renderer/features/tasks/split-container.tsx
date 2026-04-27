import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo, type CSSProperties, type ReactNode } from 'react';
import { asMounted, getProjectStore } from '@renderer/features/projects/stores/project-selectors';
import { SplitDragHandleProvider } from '@renderer/features/tasks/split-drag-handle-context';
import { ProjectSplitStore } from '@renderer/features/tasks/stores/project-split-store';
import { asProvisioned, getTaskStore } from '@renderer/features/tasks/stores/task-selectors';
import { TaskViewStore } from '@renderer/features/tasks/stores/task-view';
import {
  ProvisionedTaskProvider,
  ProvisionedTaskValueProvider,
  TaskViewWrapper,
  useTaskViewContext,
} from '@renderer/features/tasks/task-view-context';
import { useNavigate } from '@renderer/lib/layout/navigation-provider';
import { useShowModal } from '@renderer/lib/modal/modal-provider';
import { cn } from '@renderer/utils/utils';
import { EditorProvider } from './editor/editor-provider';
import { TaskMainPanel } from './main-panel';

/**
 * Renders the active task tab's split grid.
 *
 * This is intentionally flat. The previous implementation tried to model every
 * split as nested ResizablePanelGroups; after two or three splits the nested
 * groups started fighting over measurement/mount order and terminals collapsed.
 * A task tab now owns up to 12 independent tiles in a predictable CSS grid.
 */
export const SplitContainer = observer(function SplitContainer() {
  const { projectId } = useTaskViewContext();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const project = asMounted(getProjectStore(projectId));
  if (!project) return <TaskMainPanel />;

  const layout = project.splitLayout;
  const leaves = layout.leaves;

  if (leaves.length <= 1) {
    return (
      <TileFrame projectId={projectId} layout={layout} leafId={layout.activeLeafId}>
        <TaskMainPanel />
      </TileFrame>
    );
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId) return;
    layout.reorderLeaf(activeId, overId);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={leaves.map((leaf) => leaf.id)} strategy={rectSortingStrategy}>
        <div className="grid h-full w-full gap-px bg-border/70" style={gridStyle(leaves.length)}>
          {leaves.map((leaf) => (
            <TileFrame
              key={leaf.id}
              projectId={projectId}
              layout={layout}
              leafId={leaf.id}
              sortable
            >
              <LeafTile
                projectId={projectId}
                layout={layout}
                leafId={leaf.id}
                taskId={leaf.taskId}
              />
            </TileFrame>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
});

function gridStyle(count: number): CSSProperties {
  const columns = count <= 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : 4;
  return {
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gridAutoRows: 'minmax(0, 1fr)',
  };
}

const LeafTile = observer(function LeafTile({
  projectId,
  layout,
  leafId,
  taskId,
}: {
  projectId: string;
  layout: ProjectSplitStore;
  leafId: string;
  taskId: string | null;
}) {
  const { taskId: activeRouteTaskId } = useTaskViewContext();
  const effectiveTaskId = taskId ?? activeRouteTaskId;
  const conversationPaneId = layout.hasSplit ? `conversations:${leafId}` : 'conversations';
  const conversationId = layout.leaves.find((leaf) => leaf.id === leafId)?.conversationId;

  if (!effectiveTaskId) {
    return <EmptyLeaf projectId={projectId} layout={layout} leafId={leafId} />;
  }

  if (layout.hasSplit && !conversationId) {
    return (
      <EmptyConversationLeaf
        projectId={projectId}
        taskId={effectiveTaskId}
        layout={layout}
        leafId={leafId}
      />
    );
  }

  // The focused/routed tile reuses the outer providers mounted by taskView.WrapView.
  if (leafId === layout.activeLeafId && effectiveTaskId === activeRouteTaskId) {
    return (
      <TaskMainPanel
        conversationPaneId={conversationPaneId}
        conversationId={conversationId}
        onConversationCreated={(id) => layout.setLeafConversation(leafId, id)}
      />
    );
  }

  // Same task, second tile: clone the task view so conversation tabs/shortcuts do
  // not fight the active tile. Editor is disabled for duplicate same-task tiles
  // because Monaco is single-lease per task.
  if (effectiveTaskId === activeRouteTaskId) {
    return (
      <TaskViewWrapper projectId={projectId} taskId={effectiveTaskId}>
        <SplitLeafProvisionedTaskProvider projectId={projectId} taskId={effectiveTaskId}>
          {(blockedConversationIds) => (
            <TaskMainPanel
              allowEditor={false}
              allowShortcuts={false}
              conversationPaneId={conversationPaneId}
              blockedConversationIds={blockedConversationIds}
              conversationId={conversationId}
              onConversationCreated={(id) => layout.setLeafConversation(leafId, id)}
            />
          )}
        </SplitLeafProvisionedTaskProvider>
      </TaskViewWrapper>
    );
  }

  return (
    <TaskViewWrapper projectId={projectId} taskId={effectiveTaskId}>
      <ProvisionedTaskProvider projectId={projectId} taskId={effectiveTaskId}>
        <EditorProvider key={effectiveTaskId} taskId={effectiveTaskId} projectId={projectId}>
          <TaskMainPanel
            allowShortcuts={false}
            conversationPaneId={conversationPaneId}
            conversationId={conversationId}
            onConversationCreated={(id) => layout.setLeafConversation(leafId, id)}
          />
        </EditorProvider>
      </ProvisionedTaskProvider>
    </TaskViewWrapper>
  );
});

const SplitLeafProvisionedTaskProvider = observer(function SplitLeafProvisionedTaskProvider({
  projectId,
  taskId,
  children,
}: {
  projectId: string;
  taskId: string;
  children: (blockedConversationIds: readonly string[]) => ReactNode;
}) {
  const provisioned = asProvisioned(getTaskStore(projectId, taskId));

  const leafTaskView = useMemo(() => {
    if (!provisioned) return null;
    return new TaskViewStore(
      {
        conversations: provisioned.conversations,
        terminals: provisioned.terminals,
        git: provisioned.workspace.git,
        pr: provisioned.workspace.pr,
        projectId,
        workspaceId: provisioned.workspaceId,
      },
      provisioned.taskView.snapshot
    );
  }, [projectId, provisioned]);

  useEffect(() => {
    return () => {
      leafTaskView?.dispose();
    };
  }, [leafTaskView]);

  const scopedProvisioned = useMemo(() => {
    if (!provisioned || !leafTaskView) return null;
    const clone = Object.create(Object.getPrototypeOf(provisioned)) as typeof provisioned;
    Object.defineProperties(clone, Object.getOwnPropertyDescriptors(provisioned));
    Object.defineProperty(clone, 'taskView', {
      value: leafTaskView,
      enumerable: true,
      configurable: true,
      writable: false,
    });
    return clone;
  }, [leafTaskView, provisioned]);

  if (!scopedProvisioned || !leafTaskView) return null;

  return (
    <ProvisionedTaskValueProvider value={scopedProvisioned}>
      {children([])}
    </ProvisionedTaskValueProvider>
  );
});

const TileFrame = observer(function TileFrame({
  projectId,
  layout,
  leafId,
  children,
  sortable = false,
}: {
  projectId: string;
  layout: ProjectSplitStore;
  leafId: string;
  children: ReactNode;
  sortable?: boolean;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: leafId,
    disabled: !sortable,
  });
  const { navigate } = useNavigate();
  const isActive = leafId === layout.activeLeafId;
  const showFrame = layout.leafCount > 1;
  const handleFocus = useCallback(() => {
    if (isActive) return;
    layout.focusLeaf(leafId);
    const leaf = layout.leaves.find((l) => l.id === leafId);
    if (leaf?.taskId) {
      navigate('task', { projectId, taskId: leaf.taskId });
    }
  }, [isActive, layout, leafId, navigate, projectId]);

  const handleCloseTile = useCallback(() => {
    if (layout.leafCount <= 1) return;
    layout.closeLeaf(leafId);
    const next = layout.activeLeaf;
    if (next?.taskId) {
      navigate('task', { projectId, taskId: next.taskId });
    }
  }, [layout, leafId, navigate, projectId]);

  if (!showFrame) {
    return (
      <div data-tile-id={leafId} className="h-full w-full overflow-hidden">
        {children}
      </div>
    );
  }

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      data-tile-id={leafId}
      onMouseDownCapture={handleFocus}
      onFocusCapture={handleFocus}
      style={style}
      className={cn(
        'group/tile relative h-full min-h-0 w-full min-w-0 overflow-hidden bg-background',
        isActive ? 'ring-1 ring-inset ring-foreground/30' : 'opacity-95',
        isDragging && 'scale-[0.985] opacity-75 shadow-2xl'
      )}
    >
      <button
        type="button"
        title="Close split tile"
        aria-label="Close split tile"
        className="absolute right-12 top-1.5 z-20 flex size-7 items-center justify-center rounded-md border border-border/70 bg-background/90 text-foreground-muted opacity-0 shadow-sm transition-opacity hover:bg-background-2 hover:text-foreground group-hover/tile:opacity-100"
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleCloseTile();
        }}
      >
        <X className="size-3.5" />
      </button>
      {sortable ? (
        <SplitDragHandleProvider value={{ attributes, listeners, setActivatorNodeRef }}>
          {children}
        </SplitDragHandleProvider>
      ) : (
        children
      )}
    </div>
  );
});

const EmptyConversationLeaf = observer(function EmptyConversationLeaf({
  projectId,
  taskId,
  layout,
  leafId,
}: {
  projectId: string;
  taskId: string;
  layout: ProjectSplitStore;
  leafId: string;
}) {
  const showCreateConversation = useShowModal('createConversationModal');
  const mountedProject = asMounted(getProjectStore(projectId));
  const connectionId =
    mountedProject?.data.type === 'ssh' ? mountedProject.data.connectionId : undefined;

  const createConversation = useCallback(() => {
    showCreateConversation({
      connectionId,
      projectId,
      taskId,
      onSuccess: (result) => {
        const { conversationId } = result as { conversationId: string };
        layout.setLeafConversation(leafId, conversationId);
        layout.focusLeaf(leafId);
      },
    });
  }, [connectionId, layout, leafId, projectId, showCreateConversation, taskId]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 bg-background">
      <p className="text-xs font-mono text-foreground-muted">Empty agent tile</p>
      <button
        onClick={createConversation}
        className="rounded border border-border px-3 py-1.5 text-xs hover:bg-foreground/5"
      >
        Create conversation
      </button>
    </div>
  );
});

const EmptyLeaf = observer(function EmptyLeaf({
  projectId,
  layout,
  leafId,
}: {
  projectId: string;
  layout: ProjectSplitStore;
  leafId: string;
}) {
  const { navigate } = useNavigate();
  const showSplitTaskPicker = useShowModal('splitTaskPickerModal');

  const openPicker = useCallback(() => {
    showSplitTaskPicker({
      projectId,
      onSuccess: (result) => {
        const { taskId } = result as { taskId: string };
        layout.setLeafTask(leafId, taskId);
        layout.focusLeaf(leafId);
        navigate('task', { projectId, taskId });
      },
    });
  }, [layout, leafId, navigate, projectId, showSplitTaskPicker]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6">
      <p className="text-xs font-mono text-foreground-muted">Empty split</p>
      <button
        onClick={openPicker}
        className="rounded border border-border px-3 py-1.5 text-xs hover:bg-foreground/5"
      >
        Choose task
      </button>
    </div>
  );
});
