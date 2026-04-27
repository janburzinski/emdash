import { arrayMove } from '@dnd-kit/sortable';
import { makeAutoObservable } from 'mobx';
import type {
  ProjectSplitSnapshot,
  SplitGroupSnapshot,
  SplitLeafSnapshot,
  SplitNodeSnapshot,
  SplitOrientation,
} from '@shared/view-state';
import type { Snapshottable } from '@renderer/lib/stores/snapshottable';

export const MAX_SPLIT_LEAVES = 12;

type Leaf = {
  kind: 'leaf';
  id: string;
  taskId: string | null;
  conversationId: string | null;
};

type Group = {
  kind: 'split';
  id: string;
  orientation: SplitOrientation;
  sizes: number[];
  children: Node[];
};

type Node = Leaf | Group;

type TabLayout = {
  root: Node;
  activeLeafId: string;
};

function newId(): string {
  return crypto.randomUUID();
}

function makeLeaf(taskId: string | null): Leaf {
  return { kind: 'leaf', id: newId(), taskId, conversationId: null };
}

function cloneNode(node: SplitNodeSnapshot, fallbackTaskId: string | null = null): Node {
  if (node.kind === 'leaf') {
    return {
      kind: 'leaf',
      id: node.id,
      taskId: node.taskId ?? fallbackTaskId,
      conversationId: node.conversationId ?? null,
    };
  }
  return {
    kind: 'split',
    id: node.id,
    orientation: node.orientation,
    sizes: [...node.sizes],
    children: node.children.map((child) => cloneNode(child, fallbackTaskId)),
  };
}

function snapshotNode(node: Node): SplitNodeSnapshot {
  if (node.kind === 'leaf') {
    return {
      kind: 'leaf',
      id: node.id,
      taskId: node.taskId,
      conversationId: node.conversationId,
    } satisfies SplitLeafSnapshot;
  }
  return {
    kind: 'split',
    id: node.id,
    orientation: node.orientation,
    sizes: [...node.sizes],
    children: node.children.map(snapshotNode),
  } satisfies SplitGroupSnapshot;
}

function leavesOf(node: Node): Leaf[] {
  if (node.kind === 'leaf') return [node];
  return node.children.flatMap(leavesOf);
}

function eachParent(root: Node, visit: (parent: Group, childIndex: number, child: Node) => void) {
  if (root.kind !== 'split') return;
  for (let i = 0; i < root.children.length; i++) {
    visit(root, i, root.children[i]);
    eachParent(root.children[i], visit);
  }
}

function findLeaf(root: Node, leafId: string): Leaf | null {
  if (root.kind === 'leaf') return root.id === leafId ? root : null;
  for (const c of root.children) {
    const hit = findLeaf(c, leafId);
    if (hit) return hit;
  }
  return null;
}

function findParent(root: Node, leafId: string): { parent: Group; index: number } | null {
  if (root.kind === 'leaf') return null;
  for (let i = 0; i < root.children.length; i++) {
    const child = root.children[i];
    if (child.kind === 'leaf' && child.id === leafId) return { parent: root, index: i };
    if (child.kind === 'split') {
      const hit = findParent(child, leafId);
      if (hit) return hit;
    }
  }
  return null;
}

function setEvenSizes(group: Group): void {
  const size = 100 / group.children.length;
  group.sizes = group.children.map(() => size);
}

function compactEmptyLeaves(node: Node): Node | null {
  if (node.kind === 'leaf') return node.taskId ? node : null;

  const children = node.children.map(compactEmptyLeaves).filter(Boolean) as Node[];
  if (children.length === 0) return null;
  if (children.length === 1) return children[0];

  node.children = children;
  setEvenSizes(node);
  return node;
}

function firstLeafId(root: Node): string {
  return leavesOf(root)[0]?.id ?? newId();
}

/**
 * Renderer-side split layouts for a project, scoped per task tab.
 *
 * A task owns its own tiling tree. Switching from task A to task B no longer
 * drags A's splits along: A can have twelve tiles while B remains a single
 * terminal/conversation/editor view. Older snapshots with one project-wide
 * `root` are migrated into the first active task layout.
 */
export class ProjectSplitStore implements Snapshottable<ProjectSplitSnapshot> {
  private layoutsByTaskId = new Map<string, TabLayout>();
  private fallbackLayout: TabLayout;
  activeTaskId: string | null = null;

  constructor(initialTaskId: string | null = null, savedSnapshot?: ProjectSplitSnapshot) {
    const fallbackLeaf = makeLeaf(initialTaskId);
    this.fallbackLayout = { root: fallbackLeaf, activeLeafId: fallbackLeaf.id };

    if (savedSnapshot?.layoutsByTaskId) {
      for (const [taskId, snapshot] of Object.entries(savedSnapshot.layoutsByTaskId)) {
        const root = compactEmptyLeaves(cloneNode(snapshot.root, taskId)) ?? makeLeaf(taskId);
        const leaves = leavesOf(root);
        const activeLeafId =
          leaves.find((leaf) => leaf.id === snapshot.activeLeafId)?.id ?? firstLeafId(root);
        this.layoutsByTaskId.set(taskId, { root, activeLeafId });
      }
      this.activeTaskId = savedSnapshot.activeTaskId ?? initialTaskId;
    } else if (savedSnapshot?.root) {
      const taskId = initialTaskId ?? leavesOf(cloneNode(savedSnapshot.root))[0]?.taskId ?? null;
      if (taskId) {
        const root = compactEmptyLeaves(cloneNode(savedSnapshot.root, taskId)) ?? makeLeaf(taskId);
        const leaves = leavesOf(root);
        const activeLeafId =
          leaves.find((leaf) => leaf.id === savedSnapshot.activeLeafId)?.id ?? firstLeafId(root);
        this.layoutsByTaskId.set(taskId, { root, activeLeafId });
        this.activeTaskId = taskId;
      }
    } else {
      this.activeTaskId = initialTaskId;
      if (initialTaskId) this.ensureTaskLayout(initialTaskId);
    }

    makeAutoObservable(this);
  }

  setActiveTask(taskId: string): void {
    this.activeTaskId = taskId;
    this.ensureTaskLayout(taskId);
  }

  get root(): Node {
    return this.activeLayout.root;
  }

  get activeLeafId(): string {
    return this.activeLayout.activeLeafId;
  }

  get leaves(): readonly Leaf[] {
    return leavesOf(this.root);
  }

  get leafCount(): number {
    return this.leaves.length;
  }

  get hasSplit(): boolean {
    return this.root.kind === 'split';
  }

  get activeLeaf(): Leaf | null {
    return findLeaf(this.root, this.activeLeafId);
  }

  get snapshot(): ProjectSplitSnapshot {
    return {
      root: snapshotNode(this.root),
      activeLeafId: this.activeLeafId,
      activeTaskId: this.activeTaskId,
      layoutsByTaskId: Object.fromEntries(
        Array.from(this.layoutsByTaskId.entries()).map(([taskId, layout]) => [
          taskId,
          { root: snapshotNode(layout.root), activeLeafId: layout.activeLeafId },
        ])
      ),
    };
  }

  restoreSnapshot(snapshot: Partial<ProjectSplitSnapshot>): void {
    if (snapshot.layoutsByTaskId) {
      this.layoutsByTaskId.clear();
      for (const [taskId, layoutSnapshot] of Object.entries(snapshot.layoutsByTaskId)) {
        const root = compactEmptyLeaves(cloneNode(layoutSnapshot.root, taskId)) ?? makeLeaf(taskId);
        const leaves = leavesOf(root);
        this.layoutsByTaskId.set(taskId, {
          root,
          activeLeafId:
            leaves.find((leaf) => leaf.id === layoutSnapshot.activeLeafId)?.id ?? firstLeafId(root),
        });
      }
      this.activeTaskId = snapshot.activeTaskId ?? this.activeTaskId;
      return;
    }

    if (!snapshot.root) return;
    const taskId = this.activeTaskId ?? leavesOf(cloneNode(snapshot.root))[0]?.taskId ?? null;
    if (!taskId) return;
    const root = compactEmptyLeaves(cloneNode(snapshot.root, taskId)) ?? makeLeaf(taskId);
    this.layoutsByTaskId.set(taskId, {
      root,
      activeLeafId:
        snapshot.activeLeafId && findLeaf(root, snapshot.activeLeafId)
          ? snapshot.activeLeafId
          : firstLeafId(root),
    });
  }

  focusLeaf(leafId: string): void {
    if (findLeaf(this.root, leafId)) this.activeLayout.activeLeafId = leafId;
  }

  setLeafTask(leafId: string, taskId: string | null): void {
    const leaf = findLeaf(this.root, leafId);
    if (leaf) {
      leaf.taskId = taskId;
      if (!taskId) leaf.conversationId = null;
    }
  }

  setLeafConversation(leafId: string, conversationId: string | null): void {
    const leaf = findLeaf(this.root, leafId);
    if (leaf) leaf.conversationId = conversationId;
  }

  splitActive(
    orientation: SplitOrientation,
    fromLeafId?: string,
    side: 'after' | 'before' = 'after'
  ): string | null {
    if (this.leafCount >= MAX_SPLIT_LEAVES) return null;
    const layout = this.activeLayout;
    const source = fromLeafId ? findLeaf(layout.root, fromLeafId) : this.activeLeaf;
    if (!source) return null;

    const newLeaf = makeLeaf(this.activeTaskId ?? source.taskId);
    const orderedChildren: Node[] = side === 'after' ? [source, newLeaf] : [newLeaf, source];

    if (layout.root.kind === 'leaf' && layout.root.id === source.id) {
      layout.root = {
        kind: 'split',
        id: newId(),
        orientation,
        sizes: [50, 50],
        children: orderedChildren,
      };
    } else {
      const parentInfo = findParent(layout.root, source.id);
      if (!parentInfo) return null;
      const { parent, index } = parentInfo;
      if (parent.orientation === orientation) {
        parent.children.splice(side === 'after' ? index + 1 : index, 0, newLeaf);
        setEvenSizes(parent);
      } else {
        parent.children[index] = {
          kind: 'split',
          id: newId(),
          orientation,
          sizes: [50, 50],
          children: orderedChildren,
        };
        setEvenSizes(parent);
      }
    }
    layout.activeLeafId = newLeaf.id;
    return newLeaf.id;
  }

  closeLeaf(leafId: string): void {
    if (this.leafCount <= 1) return;
    const layout = this.activeLayout;
    const parentInfo = findParent(layout.root, leafId);
    if (!parentInfo) return;
    const { parent, index } = parentInfo;

    parent.children.splice(index, 1);
    parent.sizes.splice(index, 1);
    if (parent.children.length > 1) setEvenSizes(parent);
    if (parent.children.length === 1) this.replaceNode(parent.id, parent.children[0]);
    if (layout.activeLeafId === leafId) layout.activeLeafId = firstLeafId(layout.root);
  }

  reorderLeaf(activeLeafId: string, overLeafId: string): void {
    if (activeLeafId === overLeafId) return;
    const layout = this.activeLayout;
    const leaves = leavesOf(layout.root);
    const oldIndex = leaves.findIndex((leaf) => leaf.id === activeLeafId);
    const newIndex = leaves.findIndex((leaf) => leaf.id === overLeafId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedLeaves = arrayMove(leaves, oldIndex, newIndex);
    layout.root = {
      kind: 'split',
      id: layout.root.kind === 'split' ? layout.root.id : newId(),
      orientation: layout.root.kind === 'split' ? layout.root.orientation : 'horizontal',
      sizes: reorderedLeaves.map(() => 100 / reorderedLeaves.length),
      children: reorderedLeaves,
    };
  }

  setGroupSizes(groupId: string, sizes: number[]): void {
    const group = this.findGroup(this.root, groupId);
    if (!group) return;
    if (group.sizes.length !== sizes.length) return;
    const unchanged = group.sizes.every((s, i) => Math.abs(s - sizes[i]) < 0.01);
    if (unchanged) return;
    group.sizes = [...sizes];
  }

  clearTaskFromLeaves(taskId: string): void {
    this.layoutsByTaskId.delete(taskId);
    if (this.activeTaskId === taskId) this.activeTaskId = null;
  }

  /**
   * A single FrontendPty can only be mounted in one DOM node. If two split
   * leaves point at the same conversation, xterm is reparented into the later
   * tile and the earlier tile turns blank. Keep the active task tab's leaves
   * pinned to distinct conversation ids whenever enough conversations exist.
   */
  reconcileConversations(taskId: string, conversationIds: readonly string[]): void {
    if (this.activeTaskId !== taskId) return;
    const available = conversationIds.filter(Boolean);
    if (available.length === 0) {
      for (const leaf of this.leaves) leaf.conversationId = null;
      return;
    }

    const used = new Set<string>();
    for (const leaf of this.leaves) {
      const current = leaf.conversationId;
      if (current && available.includes(current) && !used.has(current)) {
        used.add(current);
        continue;
      }

      const next = available.find((id) => !used.has(id));
      leaf.conversationId = next ?? null;
      if (next) used.add(next);
    }
  }

  private get activeLayout(): TabLayout {
    if (this.activeTaskId) return this.ensureTaskLayout(this.activeTaskId);
    return this.fallbackLayout;
  }

  private ensureTaskLayout(taskId: string): TabLayout {
    const existing = this.layoutsByTaskId.get(taskId);
    if (existing) return existing;
    const leaf = makeLeaf(taskId);
    const layout = { root: leaf, activeLeafId: leaf.id };
    this.layoutsByTaskId.set(taskId, layout);
    return layout;
  }

  private findGroup(node: Node, groupId: string): Group | null {
    if (node.kind === 'leaf') return null;
    if (node.id === groupId) return node;
    for (const c of node.children) {
      const hit = this.findGroup(c, groupId);
      if (hit) return hit;
    }
    return null;
  }

  private replaceNode(nodeId: string, replacement: Node): void {
    const layout = this.activeLayout;
    if (layout.root.kind !== 'leaf' && layout.root.id === nodeId) {
      layout.root = replacement;
      return;
    }
    eachParent(layout.root, (parent, idx, child) => {
      if (child.id === nodeId) parent.children[idx] = replacement;
    });
  }
}

export function findFocusedTileId(layout: ProjectSplitStore): string {
  if (typeof document === 'undefined') return layout.activeLeafId;
  const el = document.activeElement;
  if (el instanceof HTMLElement) {
    const tile = el.closest<HTMLElement>('[data-tile-id]');
    const id = tile?.dataset.tileId;
    if (id && layout.leaves.some((l) => l.id === id)) return id;
  }
  return layout.activeLeafId;
}
