import { signal, Signal, WritableSignal } from '@angular/core';
import { hasProcessingItem } from '../store-helper';
import { Observable } from 'rxjs';

type Path = string;

type StoreConstraints = {
  state?: Record<string, unknown>;
  mutations?: Record<string, (...data: any[]) => unknown>;
  selectors?: Record<string, unknown>;
  entities?: Record<Path, EntityConfig>;
};

type EntityConfig = {
  state: Record<string, unknown>; // from query or entitiesAccessor
  derivedState?: Record<string, unknown>; // from query derivedState
  mutations?: Record<string, (...data: any[]) => unknown>;
  entityMutations?: Record<string, (...data: any[]) => unknown>;
  entitySelectors?: Record<string, unknown>;
  selectors?: Record<string, unknown>;
};

type StoreDefaultConfig = {
  state: {
    [key: string]: unknown;
  };
  mutations: {
    [key: string]: (...data: any[]) => unknown;
  };
  selectors: {
    [key: string]: (...data: any[]) => unknown;
  };
  entities: {};
};

type MergeSameEntitiesConfig<
  A extends NonNullable<StoreConstraints['entities']>,
  K extends keyof A & keyof B & string,
  B extends NonNullable<StoreConstraints['entities']>
> = {
  state: Prettify<A[K]['state'] & B[K]['state']>;
  derivedState: Prettify<A[K]['derivedState'] & B[K]['derivedState']>;
  mutations: Prettify<NonNullable<A[K]['mutations'] & B[K]['mutations']>>;
  entityMutations: Prettify<
    NonNullable<A[K]['entityMutations'] & B[K]['entityMutations']>
  >;
  entitySelectors: Prettify<
    NonNullable<A[K]['entitySelectors'] & B[K]['entitySelectors']>
  >;
  selectors: Prettify<NonNullable<A[K]['selectors'] & B[K]['selectors']>>;
};

export type MergeEntitiesRecord<
  A extends NonNullable<StoreConstraints['entities']>,
  B extends NonNullable<StoreConstraints['entities']>
> = {
  [K in keyof A & keyof B & string]: Prettify<MergeSameEntitiesConfig<A, K, B>>;
  // add non common keys
} & {
  [K in Exclude<keyof A, keyof B>]: A[K];
} & {
  [K in Exclude<keyof B, keyof A>]: B[K];
};

// NonNullable is used to remove the undefined type from the Acc initial value
type MergeConfig<A extends StoreConstraints, B extends StoreConstraints> = {
  state: Prettify<A['state'] & B['state']>;
  mutations: Prettify<NonNullable<A['mutations'] & B['mutations']>>;
  selectors: Prettify<NonNullable<A['selectors'] & B['selectors']>>;
  // entities: Prettify<NonNullable<A['entities'] & B['entities']>>;
  entities: Prettify<
    MergeEntitiesRecord<NonNullable<A['entities']>, NonNullable<B['entities']>>
  >;
};

type MergeArgs<
  F extends StoreConstraints[],
  Acc extends StoreConstraints = {
    state: Record<string, unknown>;
    mutations: {};
    selectors: {};
    entities: {};
  }
> = F extends [infer First, ...infer Rest]
  ? First extends StoreConstraints
    ? Rest extends StoreConstraints[]
      ? MergeArgs<Rest, MergeConfig<Acc, First>>
      : Prettify<MergeConfig<Acc, First>>
    : never
  : Prettify<Acc>;

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

// export function withMethods<
//   Inputs extends StoreConstraints,
//   MethodsKey extends keyof Inputs['methods'],
//   Methods extends Record<MethodsKey, (...data: any[]) => unknown>
// >(
//   methodsFactory: (store: ToserverStateStoreApi<Inputs>) => Methods
// ): InputOutputFn<Inputs, StoreConstraints & { methods: Methods }> {
//   return (store) => {
//     const internalStore = store as unknown as StoreConstraints;
//     return {
//       ...internalStore,
//       methods: {
//         ...internalStore.methods,
//         ...methodsFactory(store),
//       },
//     } as unknown as StoreConstraints & {
//       methods: Methods;
//     };
//   };
// }

export function withQuery<
  Inputs extends StoreConstraints,
  Params,
  QueryState
>(query: {
  params: () => Observable<Params>;
  query: (queryData: { params: Params }) => Observable<QueryState>;
}): InputOutputFn<
  Inputs,
  StoreConstraints & {
    state: QueryState;
  }
> {
  return (store) => {
    return {
      query,
    } as unknown as StoreConstraints & {
      state: QueryState;
    };
  };
}

// export function withFeature<
//   Inputs extends StoreConstraints,
//   A extends StoreConstraints
// >(a: InputOutputFn<Inputs, A>): InputOutputFn<Inputs, A>;
// export function withFeature<
//   Inputs extends StoreConstraints,
//   A extends StoreConstraints,
//   B extends StoreConstraints
// >(
//   a: InputOutputFn<Inputs, A>,
//   b: InputOutputFn<A, B>
// ): InputOutputFn<Inputs, MergeArgs<[A, B]>>;
// export function withFeature<
//   A extends StoreConstraints,
//   B extends StoreConstraints,
//   C extends StoreConstraints
// >(
//   a: InputOutputFn<StoreDefaultConfig, A>,
//   b: InputOutputFn<A, B>,
//   c: InputOutputFn<Merge<A, B>, C>
// ): InputOutputFn<StoreDefaultConfig, MergeArgs<[A, B]>>;
// export function withFeature(...operations: InputOutputFn[]): InputOutputFn {
//   return (store: ToserverStateStoreApi<StoreDefaultConfig>) =>
//     operations.reduce(
//       (acc, operation) => {
//         const config = operation({
//           value: store.value,
//           methods: acc.methods,
//         } satisfies ToserverStateStoreApi<StoreDefaultConfig>);
//         return {
//           ...acc,
//           ...(config.state && { state: { ...acc.state, ...config.state } }),
//           ...(config.methods && {
//             methods: { ...acc.methods, ...config.methods },
//           }),
//         };
//       },
//       {
//         state: {},
//         methods: store.methods ?? {},
//       } as StoreDefaultConfig
//     );
// }

// todo withQuery
// todo faire cas où on récup un state avec 2 array dedans et qu'on souhaite appliquer des changements à chacun d'eux

const myStore = serverStateStore(
  () => ({
    state: {
      userSelected: null as string | null,
    },
  }),
  () => ({
    entities: {
      users: {
        state: {
          id: '',
          name: '',
          email: '',
        },
        derivedState: {
          totalUsers: 0,
        },
        mutations: {
          updateUser: (user: { id: string; name: string }) => {},
        },
        entitySelectors: {
          isProcessing: true,
        },
        selectors: {
          hasProcessing: true,
        },
      },
    },
  }),
  () => ({
    entities: {
      users: {
        state: {
          address2: '',
        },
      },
      accounts: {
        state: {
          accountId: '',
          accountName: '',
        },
        derivedState: {
          totalUsers: 0,
        },
        mutations: {
          updateAccount: (account: { id: string; name: string }) => {},
        },
        entitySelectors: {
          isProcessingAccount: true,
        },
        selectors: {
          hasProcessingAccount: true,
        },
      },
    },
  })
);

type InputOutputFn<
  Inputs extends StoreConstraints = StoreDefaultConfig,
  Outputs extends StoreConstraints = StoreDefaultConfig
> = (store: ToServerStateStoreApi<Inputs>) => Outputs;

export function serverStateStore<A extends StoreConstraints>(
  a: InputOutputFn<StoreDefaultConfig, A>
): ToServerStateStoreApi<A>;
export function serverStateStore<
  A extends StoreConstraints,
  B extends StoreConstraints
>(
  a: InputOutputFn<StoreDefaultConfig, A>,
  b: InputOutputFn<A, B>
): ToServerStateStoreApi<MergeArgs<[A, B]>>;
export function serverStateStore<
  A extends StoreConstraints,
  B extends StoreConstraints,
  C extends StoreConstraints
>(
  a: InputOutputFn<StoreDefaultConfig, A>,
  b: InputOutputFn<A, B>,
  c: InputOutputFn<MergeConfig<A, B>, C>
): ToServerStateStoreApi<MergeArgs<[A, B, C]>>;
/**
 * Please use withState, withMethods or withFeature
 * to add state or methods to the store
 */
export function serverStateStore(
  ...operations: InputOutputFn[]
): ToServerStateStoreApi<StoreConstraints> {
  // const internalState = signal({});

  // const mergeConfig = operations.reduce(
  //   (acc, operation) => {
  //     debugger;
  //     const config = operation({
  //       value: internalState,
  //       methods: acc?.methods ?? {},
  //     } satisfies ToServerStateStoreApi<StoreDefaultConfig>);

  //     return {
  //       ...acc,
  //       state: {
  //         ...acc.state,
  //         ...('state' in config && config.state),
  //       },
  //       methods: {
  //         ...acc.methods,
  //         ...('methods' in config && config.methods),
  //       },
  //     };
  //   },
  //   {
  //     state: {},
  //     methods: {},
  //   } as StoreConstraints
  // );

  // internalState.set(mergeConfig?.state ?? {});

  // return {
  //   value: internalState,
  //   methods: mergeConfig.methods ?? {},
  // } as any as ToServerStateStoreApi<StoreConstraints>;
  return {} as ToServerStateStoreApi<StoreConstraints>;
}

type ToServerStateStoreApi<T extends StoreConstraints> = Prettify<{
  value: Signal<NonNullable<Prettify<RemoveIndexSignature<T['state']>>>>;
  mutations: Prettify<RemoveIndexSignature<T['mutations']>>;
  selectors: Prettify<RemoveIndexSignature<T['selectors']>>;
  entities: T['entities'];
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
  Store extends ToServerStateStoreApi<Inputs>
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
