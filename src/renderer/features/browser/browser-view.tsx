import { Titlebar } from '@renderer/lib/components/titlebar/Titlebar';
import { BrowserMainPanel } from './browser-main-panel';
import { BrowserAnnotationsPanel } from './components/annotations-panel';

export const browserView = {
  TitlebarSlot: Titlebar,
  MainPanel: BrowserMainPanel,
  RightPanel: BrowserAnnotationsPanel,
};
