import type { WebviewTag } from 'electron';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { rpc } from '@renderer/lib/ipc';
import { browserStore } from '../store/browser-store';
import type { CapturePayload } from '../types';
import { buildInjectedPageScript } from './inject-page-script';

const WEBVIEW_PARTITION = 'persist:emdash-browser';

type WebviewHostProps = {
  webviewRef: RefObject<WebviewTag | null>;
  src: string;
  onNavigate: (url: string) => void;
  onLoadStateChange: (loading: boolean) => void;
  onLoadError: (message: string | null) => void;
};

function generateToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const WebviewHost = observer(function WebviewHost({
  webviewRef,
  src,
  onNavigate,
  onLoadStateChange,
  onLoadError,
}: WebviewHostProps) {
  const mode = browserStore.mode;
  const tokenRef = useRef<string>('');
  if (!tokenRef.current) tokenRef.current = generateToken();
  const token = tokenRef.current;

  const eventPrefix = useMemo(() => `__emdash_browser__:${token}:`, [token]);
  const injectedScript = useMemo(() => buildInjectedPageScript(token), [token]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;
    let lastInjectedUrl: string | null = null;

    const handleDomReady = () => {
      setReady(true);
      const url = wv.getURL();
      if (lastInjectedUrl !== url) {
        wv.executeJavaScript(injectedScript).catch(() => {});
        lastInjectedUrl = url;
      }
    };

    const handleDidNavigate = (e: { url: string }) => {
      browserStore.setUrl(e.url);
      onNavigate(e.url);
      lastInjectedUrl = null;
    };

    const handleDidStartLoading = () => {
      onLoadStateChange(true);
      onLoadError(null);
    };
    const handleDidStopLoading = () => onLoadStateChange(false);

    const handleDidFailLoad = (e: {
      errorCode: number;
      errorDescription: string;
      validatedURL: string;
      isMainFrame: boolean;
    }) => {
      // -3 = ABORTED (e.g. user cancelled / new navigation started). Ignore.
      if (!e.isMainFrame || e.errorCode === -3) return;
      onLoadStateChange(false);
      onLoadError(`${e.errorDescription || 'Load failed'} (${e.validatedURL})`);
    };

    const handleRenderProcessGone = () => {
      onLoadStateChange(false);
      onLoadError('The page crashed. Reload to try again.');
    };

    const handleConsoleMessage = (e: { message: string }) => {
      if (!e.message.startsWith(eventPrefix)) return;
      const json = e.message.slice(eventPrefix.length);
      let payload: CapturePayload | { kind: 'ready'; url: string };
      try {
        payload = JSON.parse(json);
      } catch {
        return;
      }
      void handlePagePayload(payload, wv);
    };

    wv.addEventListener('dom-ready', handleDomReady);
    wv.addEventListener('did-navigate', handleDidNavigate as never);
    wv.addEventListener('did-navigate-in-page', handleDidNavigate as never);
    wv.addEventListener('did-start-loading', handleDidStartLoading);
    wv.addEventListener('did-stop-loading', handleDidStopLoading);
    wv.addEventListener('did-fail-load', handleDidFailLoad as never);
    wv.addEventListener('render-process-gone', handleRenderProcessGone as never);
    wv.addEventListener('console-message', handleConsoleMessage as never);

    return () => {
      wv.removeEventListener('dom-ready', handleDomReady);
      wv.removeEventListener('did-navigate', handleDidNavigate as never);
      wv.removeEventListener('did-navigate-in-page', handleDidNavigate as never);
      wv.removeEventListener('did-start-loading', handleDidStartLoading);
      wv.removeEventListener('did-stop-loading', handleDidStopLoading);
      wv.removeEventListener('did-fail-load', handleDidFailLoad as never);
      wv.removeEventListener('render-process-gone', handleRenderProcessGone as never);
      wv.removeEventListener('console-message', handleConsoleMessage as never);
    };
  }, [webviewRef, onNavigate, onLoadStateChange, onLoadError, injectedScript, eventPrefix]);

  // Push mode changes into the page.
  useEffect(() => {
    if (!ready) return;
    const wv = webviewRef.current;
    if (!wv) return;
    const script = `if (window.__emdash) window.__emdash.setMode(${JSON.stringify(mode)});`;
    wv.executeJavaScript(script).catch(() => {});
  }, [webviewRef, mode, ready]);

  const borderClass = modeBorderClass(mode);

  return (
    <div className={`relative h-full w-full ${borderClass}`}>
      <webview
        ref={webviewRef as never}
        src={src}
        partition={WEBVIEW_PARTITION}
        className="h-full w-full"
      />
    </div>
  );
});

function modeBorderClass(mode: string): string {
  if (mode === 'pick') return 'ring-2 ring-blue-500/70 ring-inset';
  if (mode === 'select') return 'ring-2 ring-emerald-500/70 ring-inset';
  if (mode === 'region') return 'ring-2 ring-amber-500/70 ring-inset';
  return '';
}

async function handlePagePayload(
  payload: CapturePayload | { kind: 'ready'; url: string },
  wv: WebviewTag
): Promise<void> {
  if (payload.kind === 'ready') {
    browserStore.setUrl(payload.url);
    return;
  }
  if (payload.kind === 'element') {
    browserStore.addAnnotation({
      kind: 'element',
      url: payload.url,
      selector: payload.selector,
      text: payload.text,
      outerHtml: payload.outerHtml,
    });
    return;
  }
  if (payload.kind === 'text') {
    browserStore.addAnnotation({
      kind: 'text',
      url: payload.url,
      text: payload.text,
    });
    return;
  }
  if (payload.kind === 'region') {
    let webContentsId: number;
    try {
      webContentsId = wv.getWebContentsId();
    } catch {
      return;
    }
    const result = await rpc.browser.captureRegion({
      webContentsId,
      rect: payload.rect,
    });
    if (!result.success) return;
    browserStore.addAnnotation({
      kind: 'region',
      url: payload.url,
      filePath: result.data.filePath,
      dataUrl: result.data.dataUrl,
      rect: payload.rect,
    });
    browserStore.setMode('idle');
  }
}
