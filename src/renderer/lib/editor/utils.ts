const MARKDOWN_EXTENSIONS = ['md', 'mdx'];

/** Returns true if the file path points to a markdown file. */
export function isMarkdownPath(filePath: string): boolean {
  const ext = filePath.split('.').pop()?.toLowerCase();
  return ext ? MARKDOWN_EXTENSIONS.includes(ext) : false;
}

/** Alias for {@link isMarkdownPath}. */
export const isMarkdownFile = isMarkdownPath;

// ---------------------------------------------------------------------------
// Monaco editor options
// ---------------------------------------------------------------------------

/** Default Monaco editor options shared across all editor instances. */
export const DEFAULT_EDITOR_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 13,
  lineHeight: 20,
  padding: { top: 12, bottom: 12 },
  lineNumbers: 'on' as const,
  lineNumbersMinChars: 3,
  glyphMargin: false,
  folding: true,
  rulers: [],
  wordWrap: 'on' as const,
  automaticLayout: true,
  scrollBeyondLastLine: false,
  renderLineHighlight: 'none' as const,
  renderWhitespace: 'selection' as const,
  cursorBlinking: 'smooth' as const,
  cursorSmoothCaretAnimation: 'on' as const,
  smoothScrolling: true,
  formatOnPaste: true,
  formatOnType: true,
  overviewRulerLanes: 0,
  overviewRulerBorder: false,
  hideCursorInOverviewRuler: true,
  scrollbar: {
    vertical: 'auto' as const,
    horizontal: 'auto' as const,
    useShadows: false,
    verticalScrollbarSize: 6,
    horizontalScrollbarSize: 6,
    verticalSliderSize: 6,
    horizontalSliderSize: 6,
    arrowSize: 0,
    verticalHasArrows: false,
    horizontalHasArrows: false,
  },
};
