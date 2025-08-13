// signal-proxy.ts
// Purpose: Signal proxy that exposes read signals per property + write helpers for the underlying source signal.

import { Signal, signal, computed, isSignal } from '@angular/core';

type AnyRecord = Record<PropertyKey, unknown>;

type UnwrapSignals<T> = {
  [K in keyof T]: T[K] extends Signal<infer U> ? U : T[K];
};

export type SignalWrapperParams<T extends object> = {
  readonly [K in keyof T]: T[K] extends Signal<infer U>
    ? Signal<U>
    : Signal<T[K]>;
};

export type SignalProxy<T extends object> = {
  // For each property, you read it as a Signal of its final value (signals unwrapped).
  readonly [K in keyof T]: T[K] extends Signal<infer U>
    ? Signal<U>
    : Signal<T[K]>;
} & {
  /** Readonly access to the whole object as a Signal<T> */
  readonly $raw: Signal<T>;

  /** Replace the whole object */
  $set(next: T): void;

  /** Get the raw property (Signal or plain value) from the current object */
  $ref<K extends keyof T>(key: K): T[K];
};

export function createSignalProxy<T extends AnyRecord>(
  src: T | Signal<T>
): SignalProxy<T> {
  const state: Signal<T> = isSignal(src) ? src : signal(src as T);

  // Cache property computed signals for referential stability
  const cache = new Map<PropertyKey, Signal<unknown>>();

  const api = {
    $raw: state,
    $set(next: T) {
      // Replace whole object
      if ((state as any).set) {
        (state as any).set(next);
      } else {
        (state as any)(next);
      }
    },
    $ref<K extends keyof T>(key: K): T[K] {
      return (state() as any)[key];
    },
  };

  const handler: ProxyHandler<object> = {
    get(_target, prop: PropertyKey) {
      // Expose write API and $raw directly
      if (prop in api) return (api as any)[prop];

      if (
        prop === 'toJSON' ||
        prop === 'valueOf' ||
        prop === Symbol.toStringTag
      ) {
        return (state() as any)[prop];
      }

      if (cache.has(prop)) return cache.get(prop);

      // Computed read signal for property, unwrapping nested signals
      const s = computed(() => {
        const current = (state() as any)[prop];
        return isSignal(current) ? current() : current;
      });

      cache.set(prop, s);
      return s;
    },

    ownKeys() {
      return Reflect.ownKeys(state() as object);
    },
    has(_t, prop) {
      return prop in api || prop in (state() as object);
    },

    getOwnPropertyDescriptor(_t, prop) {
      if (prop in api) {
        return {
          configurable: true,
          enumerable: false,
          writable: false,
          value: (api as any)[prop],
        };
      }
      return {
        configurable: true,
        enumerable: true,
        writable: false,
        value: (this as any).get?.({}, prop),
      };
    },
  };

  return new Proxy({}, handler) as SignalProxy<T>;
}
