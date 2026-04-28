import { makeAutoObservable } from 'mobx';
import { rpc } from '@renderer/lib/ipc';
import type { Annotation, BrowserMode } from '../types';

export type AnnotationInput =
  | { kind: 'element'; url: string; selector: string; text: string; outerHtml: string }
  | { kind: 'text'; url: string; text: string }
  | {
      kind: 'region';
      url: string;
      filePath: string;
      dataUrl: string;
      rect: { x: number; y: number; width: number; height: number };
    };

function nextId(): string {
  return `ann_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export class BrowserStore {
  annotations: Annotation[] = [];
  mode: BrowserMode = 'idle';
  currentUrl = '';

  constructor() {
    makeAutoObservable(this);
  }

  addAnnotation(input: AnnotationInput): Annotation {
    const annotation: Annotation = {
      id: nextId(),
      createdAt: Date.now(),
      note: '',
      ...input,
    };
    this.annotations.push(annotation);
    return annotation;
  }

  removeAnnotation(id: string): void {
    const idx = this.annotations.findIndex((a) => a.id === id);
    if (idx === -1) return;
    const [removed] = this.annotations.splice(idx, 1);
    if (removed.kind === 'region') {
      void rpc.browser.removeAnnotationScreenshot({ filePath: removed.filePath });
    }
  }

  updateNote(id: string, note: string): void {
    const annotation = this.annotations.find((a) => a.id === id);
    if (annotation) annotation.note = note;
  }

  clearAll(): void {
    if (this.annotations.length === 0) return;
    const filePaths = this.annotations
      .filter((a): a is Extract<Annotation, { kind: 'region' }> => a.kind === 'region')
      .map((a) => a.filePath);
    this.annotations = [];
    for (const filePath of filePaths) {
      void rpc.browser.removeAnnotationScreenshot({ filePath });
    }
  }

  setMode(mode: BrowserMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
  }

  setUrl(url: string): void {
    if (this.currentUrl === url) return;
    this.currentUrl = url;
  }
}

export const browserStore = new BrowserStore();
