import { useEffect } from 'react';
import { useModalContext } from '@renderer/lib/modal/modal-provider';

export function useCloseGuard(isActive: boolean) {
  const { setCloseGuard } = useModalContext();

  useEffect(() => {
    setCloseGuard(isActive);
    return () => {
      if (isActive) setCloseGuard(false);
    };
  }, [isActive, setCloseGuard]);
}
