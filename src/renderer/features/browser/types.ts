export type BrowserMode = 'idle' | 'pick' | 'select' | 'region';

type AnnotationBase = {
  id: string;
  createdAt: number;
  url: string;
  note: string;
};

export type ElementAnnotation = AnnotationBase & {
  kind: 'element';
  selector: string;
  text: string;
  outerHtml: string;
};

export type TextAnnotation = AnnotationBase & {
  kind: 'text';
  text: string;
};

export type RegionAnnotation = AnnotationBase & {
  kind: 'region';
  filePath: string;
  dataUrl: string;
  rect: { x: number; y: number; width: number; height: number };
};

export type Annotation = ElementAnnotation | TextAnnotation | RegionAnnotation;

export type ElementCapturePayload = {
  kind: 'element';
  url: string;
  selector: string;
  text: string;
  outerHtml: string;
};

export type TextCapturePayload = {
  kind: 'text';
  url: string;
  text: string;
};

export type RegionCapturePayload = {
  kind: 'region';
  url: string;
  rect: { x: number; y: number; width: number; height: number };
};

export type CapturePayload = ElementCapturePayload | TextCapturePayload | RegionCapturePayload;
