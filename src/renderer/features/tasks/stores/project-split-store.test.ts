import { describe, expect, it } from 'vitest';
import { ProjectSplitStore } from './project-split-store';

describe('ProjectSplitStore', () => {
  it('creates a same-task right-hand leaf and focuses it when splitting', () => {
    const layout = new ProjectSplitStore('task-1');

    const newLeafId = layout.splitActive('horizontal');

    expect(newLeafId).toBeTruthy();
    expect(layout.leaves).toHaveLength(2);
    expect(layout.leaves.map((leaf) => leaf.taskId)).toEqual(['task-1', 'task-1']);
    expect(layout.leaves.map((leaf) => leaf.id)).toEqual([expect.any(String), newLeafId]);
    expect(layout.activeLeafId).toBe(newLeafId);
  });

  it('allows up to twelve splits in one task tab', () => {
    const layout = new ProjectSplitStore('task-1');

    for (let i = 1; i < 12; i++) {
      expect(layout.splitActive(i % 2 === 0 ? 'horizontal' : 'vertical')).toBeTruthy();
    }

    expect(layout.leafCount).toBe(12);
    expect(layout.splitActive('horizontal')).toBeNull();
  });

  it('keeps conversation ids unique so terminals are not mounted twice', () => {
    const layout = new ProjectSplitStore('task-1');
    const firstLeafId = layout.activeLeafId;
    const secondLeafId = layout.splitActive('horizontal');
    const thirdLeafId = layout.splitActive('vertical');

    expect(secondLeafId).toBeTruthy();
    expect(thirdLeafId).toBeTruthy();
    layout.setLeafConversation(firstLeafId, 'conv-1');
    layout.setLeafConversation(secondLeafId!, 'conv-1');
    layout.setLeafConversation(thirdLeafId!, 'conv-missing');

    layout.reconcileConversations('task-1', ['conv-1', 'conv-2']);

    expect(layout.leaves.map((leaf) => leaf.conversationId)).toEqual(['conv-1', 'conv-2', null]);
  });

  it('keeps split layouts isolated per task tab', () => {
    const layout = new ProjectSplitStore('task-1');
    layout.splitActive('horizontal');
    layout.splitActive('vertical');

    expect(layout.leafCount).toBe(3);

    layout.setActiveTask('task-2');

    expect(layout.leafCount).toBe(1);
    expect(layout.hasSplit).toBe(false);
    expect(layout.leaves.map((leaf) => leaf.taskId)).toEqual(['task-2']);

    layout.setActiveTask('task-1');

    expect(layout.leafCount).toBe(3);
    expect(layout.hasSplit).toBe(true);
  });
});
