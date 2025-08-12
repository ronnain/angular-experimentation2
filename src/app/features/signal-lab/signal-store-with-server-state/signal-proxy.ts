// signal-proxy.ts
// Purpose: Signal proxy that exposes read signals per property + write helpers for the underlying source signal.

import { Signal, signal, computed, WritableSignal } from '@angular/core';

type AnyRecord = Record<PropertyKey, unknown>;

function isSignal<T = unknown>(v: unknown): v is Signal<T> {
  return typeof v === 'function' && v !== null && 'asReadonly' in (v as object);
}

type UnwrapSignals<T> = {
  [K in keyof T]: T[K] extends Signal<infer U> ? U : T[K];
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

  /** Functional update of the whole object */
  $update(updater: (prev: T) => T): void;

  /** In-place mutate the object (Angular's signal.mutate) */
  $mutate(mutator: (draft: T) => void): void;

  /** Set a single property. If the property is a Signal<V>, calls .set(value) on it. Else patches the object */
  $setProp<K extends keyof T>(
    key: K,
    value: T[K] extends Signal<infer U> ? U : T[K]
  ): void;

  /** Patch several properties at once (unwrapped). Signals are updated via .set(), plain values are assigned */
  $patch(partial: Partial<UnwrapSignals<T>>): void;

  /** Get the raw property (Signal or plain value) from the current object */
  $ref<K extends keyof T>(key: K): T[K];
};

export function createSignalProxy<T extends AnyRecord>(
  src: T | Signal<T>
): SignalProxy<T> {
  const state: Signal<T> = isSignal<T>(src) ? src : signal(src as T);

  // Cache property computed signals for referential stability
  const cache = new Map<PropertyKey, Signal<unknown>>();

  const api = {
    $raw: state,
    $set(next: T) {
      // Replace whole object
      (state as any).set ? (state as any).set(next) : (state as any)(next);
    },
    $update(updater: (prev: T) => T) {
      (state as any).update
        ? (state as any).update(updater)
        : (state as any)(updater(state()));
    },
    $mutate(mutator: (draft: T) => void) {
      if ((state as any).mutate) (state as any).mutate(mutator);
      else {
        // Fallback if mutate is not present
        const clone = structuredClone(state());
        mutator(clone);
        (state as any).set ? (state as any).set(clone) : (state as any)(clone);
      }
    },
    $setProp<K extends keyof T>(
      key: K,
      value: T[K] extends Signal<infer U> ? U : T[K]
    ) {
      const cur = (state() as any)[key];
      if (isSignal(cur)) {
        (cur as WritableSignal<any>).set(value);
      } else {
        api.$mutate((draft: any) => {
          draft[key] = value;
        });
      }
    },
    $patch(partial: Partial<UnwrapSignals<T>>) {
      api.$mutate((draft: any) => {
        for (const k of Object.keys(partial) as (keyof T)[]) {
          const cur = draft[k];
          const val = (partial as any)[k];
          if (isSignal(cur)) {
            (cur as WritableSignal<any>).set(val);
          } else {
            (draft as any)[k] = val;
          }
        }
      });
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
