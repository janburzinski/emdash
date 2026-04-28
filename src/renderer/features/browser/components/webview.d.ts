import type { WebviewTag } from 'electron';
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      webview: DetailedHTMLProps<HTMLAttributes<WebviewTag>, WebviewTag> & {
        src?: string;
        allowpopups?: string;
        partition?: string;
        useragent?: string;
      };
    }
  }
}

export {};
