import type { WebviewTag } from 'electron';
import { useCallback, useRef, useState } from 'react';
import { UrlBar } from './components/url-bar';
import { WebviewHost } from './components/webview-host';

const DEFAULT_URL = 'https://www.google.com';

export function BrowserMainPanel() {
  const webviewRef = useRef<WebviewTag | null>(null);
  const [currentUrl, setCurrentUrl] = useState(DEFAULT_URL);
  const [loading, setLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshNavState = useCallback(() => {
    const wv = webviewRef.current;
    if (!wv) return;
    try {
      setCanGoBack(wv.canGoBack());
      setCanGoForward(wv.canGoForward());
    } catch {
      // not yet ready
    }
  }, []);

  const handleNavigate = useCallback(
    (url: string) => {
      setCurrentUrl(url);
      setErrorMessage(null);
      refreshNavState();
    },
    [refreshNavState]
  );

  const handleSubmit = useCallback((url: string) => {
    const wv = webviewRef.current;
    if (!wv) return;
    try {
      wv.loadURL(url);
    } catch {
      // ignore navigation errors
    }
  }, []);

  return (
    <div className="flex h-full w-full flex-col">
      <UrlBar
        url={currentUrl}
        loading={loading}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onBack={() => webviewRef.current?.goBack()}
        onForward={() => webviewRef.current?.goForward()}
        onReload={() => webviewRef.current?.reload()}
        onSubmit={handleSubmit}
      />
      <div className="flex-1 min-h-0 bg-background">
        <WebviewHost
          webviewRef={webviewRef}
          src={DEFAULT_URL}
          onNavigate={handleNavigate}
          onLoadStateChange={setLoading}
          onLoadError={setErrorMessage}
        />
      </div>
      {errorMessage ? (
        <div className="border-t border-border bg-background-1 px-3 py-1.5 text-xs text-destructive">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}
