import { signal, Signal, WritableSignal } from '@angular/core';

declare const __StoreBrandSymbol: unique symbol;

type StoreConstraints = {
  state?: Record<string, unknown>;
  methods?: Record<string, (...data: any[]) => unknown>;
  [__StoreBrandSymbol]: unknown;
};

type StoreConfig = {
  state: {
    [key: string]: unknown;
  };
  methods: {
    [key: string]: (...data: any[]) => unknown;
  };
  [__StoreBrandSymbol]: unknown;
};

type InputOutputFn<
  Inputs extends StoreConstraints = StoreConfig,
  Outputs extends StoreConstraints = StoreConfig
> = (store: ToMySignalStoreApi<Inputs>) => Outputs;

// todo essayer d'ajouter des shadow type pour forcer l'utilisation de fonction

// ! contrainte, les fonctions précédentes ne sont pas au courant des propriétés ajouté après, d'où le patchState
// Avntage pas de double déclaration
// Obligé de créer des méthodes pour passer les config "Storecontext" au suivant, sans avoir à réécrire les types

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

// typer les events ?

/**
 *  REFRESH: action<UserState>()({ // todo try to put here the storeEvents, that may enable to infer the storeevent type and get previous events
        resource: ({ storeEvents }) =>
          resource({
            request: () => {
              if (storeEvents.UPDATE()?.status() !== ResourceStatus.Error) {
                return undefined;
              }
              return this.updateItem();
            },
            // remember: if updateItem -> request is undefined the laoder won't becalled, and the resource status will be idle
            loader: ({ request }) =>
              this.apiService.getItemById(request?.id ?? ''),
          }),
 */

export function withMethods<
  Inputs extends StoreConstraints,
  MethodsKey extends keyof Inputs['methods'],
  Methods extends Record<MethodsKey, (...data: any[]) => unknown>
>(
  methodsFactory: (store: ToMySignalStoreApi<Inputs>) => Methods
): InputOutputFn<Inputs, StoreConstraints & { methods: Methods }> {
  return (store) => {
    return {
      ...store,
      methods: {
        ...store.methods,
        ...methodsFactory(store),
      },
    } as unknown as StoreConstraints & {
      methods: Methods;
    };
  };
}
export function withState<State extends StoreConstraints['state']>(
  methodsFactory: State
) {
  return <Inputs extends StoreConstraints>(
    inputs: ToMySignalStoreApi<Inputs>
  ) => methodsFactory as unknown as StoreConstraints & { state: State };
}

// todo try une fonction qui renvoie toutes la feature mergé en paramas
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
  a: InputOutputFn<StoreConfig, A>,
  b: InputOutputFn<A, B>,
  c: InputOutputFn<Merge<A, B>, C>
): InputOutputFn<StoreConfig, MergeArgs<[A, B]>>;
export function withFeature(operations: InputOutputFn): InputOutputFn {
  return operations as unknown as InputOutputFn;
}

const myStore = MySignalStore(
  // (inputs) => ({
  //   state: {
  //     user: {
  //       id: '1',
  //       name: 'test',
  //     },
  //   },
  //   [__StoreBrandSymbol]: Symbol('MySignalStore'),
  // }),
  withState({
    user: {
      id: '1',
      name: 'test',
    },
  }),
  // (store) => ({
  //   methods: {
  //     setName: (name: string) => {
  //       return patchState(store, (state) => ({
  //         user: { ...state.user, name },
  //       }));
  //     },
  //   },
  //   [__StoreBrandSymbol]: Symbol('MySignalStore'),
  // })
  withMethods((store) => ({
    setName: (name: string) => {
      return patchState(store, (state) => ({
        user: { ...state.user, name },
      }));
    },
  }))
);

export function MySignalStore<A extends StoreConstraints>(
  a: InputOutputFn<StoreConfig, A>
): ToMySignalStoreApi<A>;
export function MySignalStore<
  A extends StoreConstraints,
  B extends StoreConstraints
>(
  a: InputOutputFn<StoreConfig, A>,
  b: InputOutputFn<A, B>
): ToMySignalStoreApi<MergeArgs<[A, B]>>;
export function MySignalStore<
  A extends StoreConstraints,
  B extends StoreConstraints,
  C extends StoreConstraints
>(
  a: InputOutputFn<StoreConfig, A>,
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
  const mergedStateValue = operations.reduce((acc, operation) => {
    // here we just need to retrieve the state, so we don't need to pass the real store that will be used by patchState...
    const config =
      typeof operation === 'function'
        ? operation(
            undefined as unknown as ToMySignalStoreApi<StoreConstraints>
          )
        : { state: operation };
    return {
      ...acc,
      ...config.state,
    };
  }, {} as StoreConstraints['state']);

  const internalState = signal(mergedStateValue);
  const mergedMethods = operations.reduce((acc, operation) => {
    const config =
      typeof operation === 'function'
        ? operation({ value: internalState, methods: {} })
        : undefined;
    if (!config) {
      return acc;
    }

    return {
      ...acc,
      ...('methods' in config
        ? config.methods
        : (config as unknown as StoreConstraints['methods'])),
    };
  }, {} as StoreConstraints['methods']);

  return {
    value: internalState,
    methods: mergedMethods,
  } as any as ToMySignalStoreApi<StoreConstraints>;
}

type ToMySignalStoreApi<T extends StoreConstraints> = Prettify<{
  value: Signal<Prettify<RemoveIndexSignature<T['state']>>>;
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
