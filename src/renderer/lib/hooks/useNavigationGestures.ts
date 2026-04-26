import { useEffect } from 'react';
import { useNavigationHistory } from '@renderer/lib/layout/navigation-provider';

const SWIPE_THRESHOLD = 80;
const RESET_AFTER_IDLE_MS = 120;
const COOLDOWN_MS = 500;

function hasScrollableAncestor(target: EventTarget | null, deltaX: number): boolean {
  let node = target instanceof Element ? target : null;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const overflowX = style.overflowX;
    if (overflowX === 'auto' || overflowX === 'scroll') {
      const max = node.scrollWidth - node.clientWidth;
      if (max > 0) {
        const left = node.scrollLeft;
        if ((deltaX < 0 && left > 0) || (deltaX > 0 && left < max)) {
          return true;
        }
      }
    }
    node = node.parentElement;
  }
  return false;
}

export function useNavigationGestures() {
  const { goBack, goForward } = useNavigationHistory();

  useEffect(() => {
    const onMouseUp = (event: MouseEvent) => {
      if (event.button === 3) {
        event.preventDefault();
        goBack();
      } else if (event.button === 4) {
        event.preventDefault();
        goForward();
      }
    };

    let accumulatedX = 0;
    let lastEventTime = 0;
    let lockedUntil = 0;

    const onWheel = (event: WheelEvent) => {
      const now = performance.now();
      if (now < lockedUntil) return;
      const { deltaX, deltaY } = event;
      if (Math.abs(deltaX) <= Math.abs(deltaY) * 1.5) {
        accumulatedX = 0;
        lastEventTime = now;
        return;
      }
      if (hasScrollableAncestor(event.target, deltaX)) {
        accumulatedX = 0;
        lastEventTime = now;
        return;
      }
      if (now - lastEventTime > RESET_AFTER_IDLE_MS) {
        accumulatedX = 0;
      }
      accumulatedX += deltaX;
      lastEventTime = now;
      if (accumulatedX <= -SWIPE_THRESHOLD) {
        goBack();
        accumulatedX = 0;
        lockedUntil = now + COOLDOWN_MS;
      } else if (accumulatedX >= SWIPE_THRESHOLD) {
        goForward();
        accumulatedX = 0;
        lockedUntil = now + COOLDOWN_MS;
      }
    };

    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('wheel', onWheel);
    };
  }, [goBack, goForward]);
}
