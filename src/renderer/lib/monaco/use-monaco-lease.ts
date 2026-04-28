import { observable, runInAction, type IObservableValue } from 'mobx';
import { useEffect, useRef } from 'react';
import type { PoolEntry } from './monaco-pool';

export function useMonacoLease<T>(pool: {
  lease(): Promise<PoolEntry<T>>;
  release(entry: PoolEntry<T>): void;
}): IObservableValue<PoolEntry<T> | null> {
  // Stable box — created once per component mount, never replaced.
  const box = useRef(observable.box<PoolEntry<T> | null>(null)).current;

  useEffect(() => {
    let cancelled = false;
    pool.lease().then((entry) => {
      if (cancelled) {
        pool.release(entry);
        return;
      }
      runInAction(() => box.set(entry));
    });
    return () => {
      cancelled = true;
      const entry = box.get();
      runInAction(() => box.set(null));
      if (entry) pool.release(entry);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return box;
}
