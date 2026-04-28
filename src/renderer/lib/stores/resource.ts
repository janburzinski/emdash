import {
  makeObservable,
  observable,
  onBecomeObserved,
  onBecomeUnobserved,
  runInAction,
} from 'mobx';

export type ResourceStrategy<T, TEventData = void> =
  | { kind: 'demand' }
  | {
      kind: 'poll';
      intervalMs: number;
      pauseWhenHidden?: boolean;
      demandGated?: boolean;
    }
  | {
      kind: 'event';
      subscribe: (handler: (event: TEventData) => void) => () => void;
      onEvent: 'reload' | ((event: TEventData, ctx: ResourceContext<T>) => void);
      debounceMs?: number;
    };

export interface ResourceContext<T> {
  readonly data: T | null;
  reload(): void;
  set(newData: T): void;
  mutate(updater: (data: T) => void): void;
}

export class Resource<T, TEventData = void> {
  data: T | null;
  loading = false;
  error: string | undefined = undefined;
  lastUpdatedAt = 0;

  private readonly _fetch: (() => Promise<T>) | null;
  private readonly _strategies: ResourceStrategy<T, TEventData>[];
  private _inFlight: Promise<void> | null = null;
  private _stopFns: Array<() => void> = [];
  private readonly _ctx: ResourceContext<T>;

  constructor(
    fetch: (() => Promise<T>) | null,
    strategies: ResourceStrategy<T, TEventData>[],
    options?: { init?: T }
  ) {
    this._fetch = fetch;
    this._strategies = strategies;
    this.data = options?.init ?? null;

    makeObservable(this, {
      data: observable,
      loading: observable,
      error: observable,
      lastUpdatedAt: observable,
    });

    // Build the context object once using arrow functions that capture `this`.
    this._ctx = {
      get data(): T | null {
        // Intentionally returns the resource's current data value; the getter
        // is evaluated lazily each time the handler reads ctx.data.
        return null; // overridden below
      },
      reload: () => this.invalidate(),
      set: (newData: T) => {
        runInAction(() => {
          this.data = newData;
          this.lastUpdatedAt = Date.now();
        });
      },
      mutate: (updater: (data: T) => void) => {
        runInAction(() => {
          if (this.data !== null) updater(this.data);
        });
      },
    };
    // Replace the placeholder getter with one that reads the live field.
    Object.defineProperty(this._ctx, 'data', {
      get: () => this.data,
      enumerable: true,
      configurable: true,
    });

    // Wire demand and demandGated strategies in the constructor so
    // onBecomeObserved fires even before start() is called.
    for (const strategy of this._strategies) {
      if (strategy.kind === 'demand') {
        onBecomeObserved(this, 'data', () => {
          void this.load();
        });
      } else if (strategy.kind === 'poll' && strategy.demandGated) {
        this._wireDemandGatedPoll(strategy);
      }
    }
  }

  async load(): Promise<void> {
    if (!this._fetch) return;
    if (this._inFlight) return this._inFlight;

    runInAction(() => {
      this.loading = true;
    });

    this._inFlight = this._fetch()
      .then((data) => {
        runInAction(() => {
          this.data = data;
          this.loading = false;
          this.error = undefined;
          this.lastUpdatedAt = Date.now();
        });
      })
      .catch((e: unknown) => {
        runInAction(() => {
          this.error = e instanceof Error ? e.message : String(e);
          this.loading = false;
        });
      })
      .finally(() => {
        this._inFlight = null;
      });

    return this._inFlight;
  }

  invalidate(): void {
    void this.load();
  }

  setValue(data: T): void {
    runInAction(() => {
      this.data = data;
      this.lastUpdatedAt = Date.now();
    });
  }

  start(): void {
    for (const strategy of this._strategies) {
      if (strategy.kind === 'poll' && !strategy.demandGated) {
        this._startPoll(strategy);
        void this.load();
      } else if (strategy.kind === 'event') {
        this._startEvent(strategy);
        if (this._fetch) void this.load();
      }
    }
  }

  dispose(): void {
    for (const stop of this._stopFns) stop();
    this._stopFns = [];
  }

  private _wireDemandGatedPoll(
    strategy: Extract<ResourceStrategy<T, TEventData>, { kind: 'poll' }>
  ): void {
    let timer: ReturnType<typeof setInterval> | null = null;
    let visibilityHandler: (() => void) | null = null;

    const startTimer = () => {
      if (timer) return;
      timer = setInterval(() => void this.load(), strategy.intervalMs);
    };

    const stopTimer = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    onBecomeObserved(this, 'data', () => {
      void this.load();

      if (strategy.pauseWhenHidden) {
        if (!document.hidden) startTimer();
        visibilityHandler = () => {
          if (document.hidden) stopTimer();
          else startTimer();
        };
        document.addEventListener('visibilitychange', visibilityHandler);
      } else {
        startTimer();
      }
    });

    onBecomeUnobserved(this, 'data', () => {
      stopTimer();
      if (visibilityHandler) {
        document.removeEventListener('visibilitychange', visibilityHandler);
        visibilityHandler = null;
      }
    });
  }

  private _startPoll(strategy: Extract<ResourceStrategy<T, TEventData>, { kind: 'poll' }>): void {
    let timer: ReturnType<typeof setInterval> | null = null;

    const startTimer = () => {
      if (timer) return;
      timer = setInterval(() => void this.load(), strategy.intervalMs);
    };

    const stopTimer = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    if (strategy.pauseWhenHidden) {
      if (!document.hidden) startTimer();
      const handleVisibility = () => {
        if (document.hidden) stopTimer();
        else startTimer();
      };
      document.addEventListener('visibilitychange', handleVisibility);
      this._stopFns.push(() => {
        stopTimer();
        document.removeEventListener('visibilitychange', handleVisibility);
      });
    } else {
      startTimer();
      this._stopFns.push(stopTimer);
    }
  }

  private _startEvent(strategy: Extract<ResourceStrategy<T, TEventData>, { kind: 'event' }>): void {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const rawHandler = (event: TEventData) => {
      if (strategy.onEvent === 'reload') {
        if (strategy.debounceMs) {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => void this.load(), strategy.debounceMs);
        } else {
          void this.load();
        }
      } else {
        runInAction(() => {
          (strategy.onEvent as (event: TEventData, ctx: ResourceContext<T>) => void)(
            event,
            this._ctx
          );
        });
      }
    };

    const unsubscribe = strategy.subscribe(rawHandler);

    this._stopFns.push(() => {
      unsubscribe();
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
    });
  }
}
