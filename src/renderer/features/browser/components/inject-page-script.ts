export const PAGE_EVENT_PREFIX_BASE = '__emdash_browser__:';

export function buildInjectedPageScript(token: string): string {
  return `(${pageScript.toString()})(${JSON.stringify(token)});`;
}

function pageScript(token: string): void {
  const PREFIX = '__emdash_browser__:' + token + ':';
  const w = window as unknown as {
    __emdash?: { setMode: (mode: 'idle' | 'pick' | 'select' | 'region') => void };
  };
  if (w.__emdash) return;

  let hoveredEl: HTMLElement | null = null;

  const HIGHLIGHT_STYLE = '2px solid #2563eb';
  const HIGHLIGHT_BG = 'rgba(37, 99, 235, 0.12)';
  const previous = new WeakMap<HTMLElement, { outline: string; bg: string }>();

  function emit(payload: unknown): void {
    try {
      // eslint-disable-next-line no-console
      console.log(PREFIX + JSON.stringify(payload));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('emdash-browser: emit failed', error);
    }
  }

  function setHighlight(el: HTMLElement | null): void {
    if (hoveredEl && hoveredEl !== el) {
      const prev = previous.get(hoveredEl);
      if (prev) {
        hoveredEl.style.outline = prev.outline;
        hoveredEl.style.backgroundColor = prev.bg;
        previous.delete(hoveredEl);
      }
    }
    if (el && el !== hoveredEl) {
      previous.set(el, { outline: el.style.outline, bg: el.style.backgroundColor });
      el.style.outline = HIGHLIGHT_STYLE;
      el.style.backgroundColor = HIGHLIGHT_BG;
    }
    hoveredEl = el;
  }

  function clearHighlight(): void {
    setHighlight(null);
  }

  function isUniqueSelector(selector: string, el: Element): boolean {
    try {
      const matches = document.querySelectorAll(selector);
      return matches.length === 1 && matches[0] === el;
    } catch {
      return false;
    }
  }

  function buildSelector(el: Element): string {
    if (el.id) {
      const idSel = '#' + cssEscape(el.id);
      if (isUniqueSelector(idSel, el)) return idSel;
    }
    const parts: string[] = [];
    let node: Element | null = el;
    let depth = 0;
    while (node && node.nodeType === 1 && depth < 8) {
      let part = node.tagName.toLowerCase();
      if (node.classList.length > 0) {
        part +=
          '.' +
          Array.from(node.classList)
            .slice(0, 3)
            .map((c) => cssEscape(c))
            .join('.');
      }
      const parent = node.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((c) => c.tagName === node!.tagName);
        if (siblings.length > 1) {
          const idx = siblings.indexOf(node) + 1;
          part += ':nth-of-type(' + idx + ')';
        }
      }
      parts.unshift(part);
      const candidate = parts.join(' > ');
      if (depth >= 1 && isUniqueSelector(candidate, el)) return candidate;
      node = node.parentElement;
      depth += 1;
    }
    return parts.join(' > ');
  }

  function cssEscape(value: string): string {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
    return value.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function onPickMove(e: MouseEvent): void {
    const target = e.target as HTMLElement | null;
    if (!target || target === hoveredEl) return;
    setHighlight(target);
  }

  function onPickClick(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const text = (target.textContent ?? '').replace(/\s+/g, ' ').trim();
    emit({
      kind: 'element',
      url: location.href,
      selector: buildSelector(target),
      text: text.slice(0, 1000),
      outerHtml: target.outerHTML,
    });
  }

  function onSelectMouseUp(): void {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim();
    if (!text) return;
    emit({ kind: 'text', url: location.href, text });
  }

  let regionOverlay: HTMLDivElement | null = null;
  let regionRect: HTMLDivElement | null = null;
  let regionStart: { x: number; y: number } | null = null;

  function ensureRegionOverlay(): HTMLDivElement {
    if (regionOverlay) return regionOverlay;
    const overlay = document.createElement('div');
    overlay.setAttribute('data-emdash-region', '');
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;cursor:crosshair;background:rgba(0,0,0,0.08);';
    const rect = document.createElement('div');
    rect.style.cssText =
      'position:absolute;border:2px dashed #2563eb;background:rgba(37,99,235,0.15);pointer-events:none;';
    overlay.appendChild(rect);
    overlay.addEventListener('mousedown', onRegionMouseDown);
    overlay.addEventListener('mousemove', onRegionMouseMove);
    overlay.addEventListener('mouseup', onRegionMouseUp);
    document.documentElement.appendChild(overlay);
    regionOverlay = overlay;
    regionRect = rect;
    return overlay;
  }

  function removeRegionOverlay(): void {
    if (!regionOverlay) return;
    regionOverlay.removeEventListener('mousedown', onRegionMouseDown);
    regionOverlay.removeEventListener('mousemove', onRegionMouseMove);
    regionOverlay.removeEventListener('mouseup', onRegionMouseUp);
    regionOverlay.remove();
    regionOverlay = null;
    regionRect = null;
    regionStart = null;
  }

  function onRegionMouseDown(e: MouseEvent): void {
    e.preventDefault();
    regionStart = { x: e.clientX, y: e.clientY };
    if (regionRect) {
      regionRect.style.left = e.clientX + 'px';
      regionRect.style.top = e.clientY + 'px';
      regionRect.style.width = '0px';
      regionRect.style.height = '0px';
    }
  }

  function onRegionMouseMove(e: MouseEvent): void {
    if (!regionStart || !regionRect) return;
    const x = Math.min(regionStart.x, e.clientX);
    const y = Math.min(regionStart.y, e.clientY);
    const w = Math.abs(e.clientX - regionStart.x);
    const h = Math.abs(e.clientY - regionStart.y);
    regionRect.style.left = x + 'px';
    regionRect.style.top = y + 'px';
    regionRect.style.width = w + 'px';
    regionRect.style.height = h + 'px';
  }

  function onRegionMouseUp(e: MouseEvent): void {
    if (!regionStart) return;
    const x = Math.min(regionStart.x, e.clientX);
    const y = Math.min(regionStart.y, e.clientY);
    const width = Math.abs(e.clientX - regionStart.x);
    const height = Math.abs(e.clientY - regionStart.y);
    regionStart = null;
    if (width < 5 || height < 5) return;
    emit({ kind: 'region', url: location.href, rect: { x, y, width, height } });
  }

  function detachAll(): void {
    document.removeEventListener('mouseover', onPickMove, true);
    document.removeEventListener('click', onPickClick, true);
    document.removeEventListener('mouseup', onSelectMouseUp, true);
    clearHighlight();
    removeRegionOverlay();
  }

  function setMode(next: 'idle' | 'pick' | 'select' | 'region'): void {
    detachAll();
    if (next === 'pick') {
      document.addEventListener('mouseover', onPickMove, true);
      document.addEventListener('click', onPickClick, true);
    } else if (next === 'select') {
      document.addEventListener('mouseup', onSelectMouseUp, true);
    } else if (next === 'region') {
      ensureRegionOverlay();
    }
  }

  w.__emdash = { setMode };
  emit({ kind: 'ready', url: location.href });
}
