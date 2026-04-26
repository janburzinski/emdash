import type { GitStatus, GitStatusEntry } from '@pierre/trees';
import { FileTree, useFileTree } from '@pierre/trees/react';
import { reaction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef } from 'react';
import type { FileNode } from '@shared/fs';
import type { GitChangeStatus } from '@shared/git';
import { useProvisionedTask } from '@renderer/features/tasks/task-view-context';

const STATUS_MAP: Record<GitChangeStatus, GitStatus> = {
  added: 'added',
  modified: 'modified',
  deleted: 'deleted',
  renamed: 'renamed',
  conflicted: 'modified',
};

function nodesToPaths(nodes: Map<string, FileNode>): string[] {
  const paths: string[] = [];
  for (const node of nodes.values()) {
    if (!node.path) continue;
    paths.push(node.type === 'directory' ? `${node.path}/` : node.path);
  }
  return paths;
}

const stripTrailingSlash = (p: string): string => (p.endsWith('/') ? p.slice(0, -1) : p);

export const EditorFileTree = observer(function EditorFileTree() {
  const taskState = useProvisionedTask();
  const files = taskState.workspace.files;
  const taskView = taskState.taskView;
  const editorView = taskView.editorView;

  const treeData = files.tree.data;
  const paths = useMemo(() => {
    void treeData;
    return nodesToPaths(files.nodes);
  }, [treeData, files.nodes]);

  const initialPathsRef = useRef(paths);
  const initialExpandedRef = useRef([...editorView.expandedPaths].map((p) => `${p}/`));

  const { model } = useFileTree({
    paths: initialPathsRef.current,
    initialExpandedPaths: initialExpandedRef.current,
    icons: 'standard',
    density: 'compact',
    onSelectionChange: (selected) => {
      const last = selected[selected.length - 1];
      if (!last || last.endsWith('/')) return;
      const path = stripTrailingSlash(last);
      if (taskView.view !== 'editor') taskView.setView('editor');
      editorView.openFilePreview(path);
    },
  });

  useEffect(() => {
    if (paths === initialPathsRef.current) return;
    model.resetPaths(paths);
  }, [model, paths]);

  useEffect(() => {
    return reaction(
      () => taskState.workspace.git.fileChanges ?? [],
      (changes) => {
        const entries: GitStatusEntry[] = changes.map((c) => ({
          path: c.path,
          status: STATUS_MAP[c.status],
        }));
        model.setGitStatus(entries);
      },
      { fireImmediately: true }
    );
  }, [model, taskState]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const flush = (): void => {
      timer = null;
      const expanded = new Set<string>();
      for (const node of files.nodes.values()) {
        if (node.type !== 'directory' || !node.path) continue;
        const item = model.getItem(`${node.path}/`);
        if (item && 'isExpanded' in item && item.isExpanded()) {
          expanded.add(node.path);
        }
      }
      editorView.expandedPaths.replace(expanded);
    };
    return model.subscribe(() => {
      if (timer) return;
      timer = setTimeout(flush, 150);
    });
  }, [model, editorView, files]);

  if (files.isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (files.error) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-destructive">
        {files.error}
      </div>
    );
  }

  return (
    <FileTree model={model} className="editor-file-tree h-full w-full" style={{ height: '100%' }} />
  );
});
