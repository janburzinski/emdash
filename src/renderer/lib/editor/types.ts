import { FileRendererData } from '@renderer/features/tasks/types';

export type ManagedFileKind = 'text' | 'markdown' | 'svg' | 'image' | 'too-large' | 'binary';

export interface ManagedFile {
  path: string;
  kind: ManagedFileKind;
  content: string;
  isLoading: boolean;
  totalSize?: number | null;
  tabId: string;
  renderer: FileRendererData;
}

export interface EditorTab extends ManagedFile {
  isPreview: boolean;
}
