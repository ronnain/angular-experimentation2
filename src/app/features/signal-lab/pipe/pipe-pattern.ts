import { signal, Signal, WritableSignal } from '@angular/core';

declare const __StoreBrandSymbol: unique symbol;

type StoreConstraints = {
  state?: Record<string, unknown>;
  methods?: Record<string, (...data: any[]) => unknown>;
  [__StoreBrandSymbol]: unknown;
};

type StoreDefaultConfig = {
  state: {
    [key: string]: unknown;
  };
  methods: {
    [key: string]: (...data: any[]) => unknown;
  };
  [__StoreBrandSymbol]: unknown;
};

// NonNullable is used to remove the undefined type from the Acc initial value
type Merge<A extends StoreConstraints, B extends StoreConstraints> = {
  state: Prettify<A['state'] & B['state']>;
  methods: Prettify<NonNullable<A['methods'] & B['methods']>>;
  [__StoreBrandSymbol]: unknown;
};

type MergeArgs<
  F extends StoreConstraints[],
  Acc extends StoreConstraints = {
    state: Record<string, unknown>;
    methods: {};
    [__StoreBrandSymbol]: unknown;
  }
> = F extends [infer First, ...infer Rest]
  ? First extends StoreConstraints
    ? Rest extends StoreConstraints[]
      ? MergeArgs<Rest, Merge<Acc, First>>
      : Prettify<Merge<Acc, First>>
    : never
  : Prettify<Acc>;

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export function withMethods<
  Inputs extends StoreConstraints,
  MethodsKey extends keyof Inputs['methods'],
  Methods extends Record<MethodsKey, (...data: any[]) => unknown>
>(
  methodsFactory: (store: ToMySignalStoreApi<Inputs>) => Methods
): InputOutputFn<Inputs, StoreConstraints & { methods: Methods }> {
  return (store) => {
    const internalStore = store as unknown as StoreConstraints;
    return {
      ...internalStore,
      methods: {
        ...internalStore.methods,
        ...methodsFactory(store),
      },
    } as unknown as StoreConstraints & {
      methods: Methods;
    };
  };
}
export function withState<
  Inputs extends StoreConstraints,
  State extends StoreConstraints['state']
>(
  state: State
): InputOutputFn<
  Inputs,
  StoreConstraints & {
    state: State;
  }
> {
  return (store) => {
    return {
      state,
    } as unknown as StoreConstraints & {
      state: State;
    };
  };
}

export function withFeature<
  Inputs extends StoreConstraints,
  A extends StoreConstraints
>(a: InputOutputFn<Inputs, A>): InputOutputFn<Inputs, A>;
export function withFeature<
  Inputs extends StoreConstraints,
  A extends StoreConstraints,
  B extends StoreConstraints
>(
  a: InputOutputFn<Inputs, A>,
  b: InputOutputFn<A, B>
): InputOutputFn<Inputs, MergeArgs<[A, B]>>;
export function withFeature<
  A extends StoreConstraints,
  B extends StoreConstraints,
  C extends StoreConstraints
>(
  a: InputOutputFn<StoreDefaultConfig, A>,
  b: InputOutputFn<A, B>,
  c: InputOutputFn<Merge<A, B>, C>
): InputOutputFn<StoreDefaultConfig, MergeArgs<[A, B]>>;
export function withFeature(...operations: InputOutputFn[]): InputOutputFn {
  return (store: ToMySignalStoreApi<StoreDefaultConfig>) =>
    operations.reduce(
      (acc, operation) => {
        const config = operation({
          value: store.value,
          methods: acc.methods,
        } satisfies ToMySignalStoreApi<StoreDefaultConfig>);
        return {
          ...acc,
          ...(config.state && { state: { ...acc.state, ...config.state } }),
          ...(config.methods && {
            methods: { ...acc.methods, ...config.methods },
          }),
        };
      },
      {
        state: {},
        methods: store.methods ?? {},
      } as StoreDefaultConfig
    );
}

const myStore = MySignalStore(
  withState({
    user: {
      id: '1',
      name: 'test',
    },
  }),
  withMethods((store) => ({
    setName: (name: string) => {
      return patchState(store, (state) => ({
        user: { ...state.user, name },
      }));
    },
  }))
);

type InputOutputFn<
  Inputs extends StoreConstraints = StoreDefaultConfig,
  Outputs extends StoreConstraints = StoreDefaultConfig
> = (store: ToMySignalStoreApi<Inputs>) => Outputs;

export function MySignalStore<A extends StoreConstraints>(
  a: InputOutputFn<StoreDefaultConfig, A>
): ToMySignalStoreApi<A>;
export function MySignalStore<
  A extends StoreConstraints,
  B extends StoreConstraints
>(
  a: InputOutputFn<StoreDefaultConfig, A>,
  b: InputOutputFn<A, B>
): ToMySignalStoreApi<MergeArgs<[A, B]>>;
export function MySignalStore<
  A extends StoreConstraints,
  B extends StoreConstraints,
  C extends StoreConstraints
>(
  a: InputOutputFn<StoreDefaultConfig, A>,
  b: InputOutputFn<A, B>,
  c: InputOutputFn<Merge<A, B>, C>
): ToMySignalStoreApi<MergeArgs<[A, B, C]>>;
/**
 * Please use withState, withMethods or withFeature
 * to add state or methods to the store
 */
export function MySignalStore(
  ...operations: InputOutputFn[]
): ToMySignalStoreApi<StoreConstraints> {
  const internalState = signal({});

  const mergeConfig = operations.reduce(
    (acc, operation) => {
      const config = operation({
        value: internalState,
        methods: acc?.methods ?? {},
      } satisfies ToMySignalStoreApi<StoreDefaultConfig>);

      return {
        ...acc,
        state: {
          ...acc.state,
          ...('state' in config && config.state),
        },
        methods: {
          ...acc.methods,
          ...('methods' in config && config.methods),
        },
      };
    },
    {
      state: {},
      methods: {},
    } as StoreConstraints
  );

  internalState.set(mergeConfig?.state ?? {});

  return {
    value: internalState,
    methods: mergeConfig.methods ?? {},
  } as any as ToMySignalStoreApi<StoreConstraints>;
}

type ToMySignalStoreApi<T extends StoreConstraints> = Prettify<{
  value: Signal<NonNullable<Prettify<RemoveIndexSignature<T['state']>>>>;
  methods: Prettify<RemoveIndexSignature<T['methods']>>;
}>;

export type RemoveIndexSignature<T> = {
  [K in keyof T as string extends K
    ? never
    : number extends K
    ? never
    : symbol extends K
    ? never
    : K]: T[K];
};

type WritableSignalValue<T> = T extends Signal<infer U> ? U : never;

export function patchState<
  Inputs extends StoreConstraints,
  Store extends ToMySignalStoreApi<Inputs>
>(
  storeInputs: Store,
  patchFn: (
    state: WritableSignalValue<Store['value']>
  ) => Partial<WritableSignalValue<Store['value']>>
) {
  // the store will expose a signal, but in reality it is a writable signal
  (storeInputs.value as WritableSignal<any>).update((state) => ({
    ...state,
    ...patchFn(state as WritableSignalValue<Store['value']>),
  }));
}
