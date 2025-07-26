import {
  EffectRef,
  ResourceOptions,
  ResourceRef,
  Signal,
  effect,
  resource,
  signal,
  untracked,
} from '@angular/core';
import {
  patchState,
  Prettify,
  SignalStoreFeature,
  signalStoreFeature,
  SignalStoreFeatureResult,
  StateSignals,
  withProps,
  WritableStateSource,
} from '@ngrx/signals';
import { InternalType, MergeObject } from './types/util.type';
import { Merge } from '../../../util/types/merge';
import {
  createNestedStateUpdate,
  getNestedStateValue,
} from './update-state.util';
import { ObjectDeepPath } from './types/object-deep-path-mapper.type';
import {
  AccessTypeObjectPropertyByDottedPath,
  DottedPathPathToTuple,
} from './types/access-type-object-property-by-dotted-path.type';
import { ResourceWithParamsOrParamsFn } from './types/resource-with-params-or-params-fn.type';
import {
  OptimisticPathMutationQuery,
  ReloadQueriesConfig,
  QueryAndMutationRecordConstraints,
  OptimisticPatchQueryFn,
} from './types/shared.type';
import { __InternalSharedMutationConfig } from './with-mutation';
import { unknown } from 'arktype/internal/keywords/ts.ts';

const __QueryBrandSymbol: unique symbol = Symbol();
type QueryBrand = {
  [__QueryBrandSymbol]: unknown;
};

type WithQueryOutputStoreConfig<
  ResourceName,
  ResourceState extends object | undefined,
  ResourceParams,
  ResourceArgsParams
> = {
  state: {};
  props: Merge<
    {
      [key in `${ResourceName & string}Query`]: ResourceRef<ResourceState>;
    },
    {
      __query: {
        [key in ResourceName & string]: Prettify<
          InternalType<ResourceState, ResourceParams, ResourceArgsParams>
        >;
      };
    }
  >;
  methods: {};
};

type MapResourceToState<
  ResourceState,
  ResourceParams,
  ClientStateTypeByDottedPath
> = (queryData: {
  queryResource: ResourceRef<NoInfer<ResourceState>>;
  queryParams: NoInfer<ResourceParams>;
}) => NoInfer<ClientStateTypeByDottedPath>;

type QueryDeclarativeEffect<
  QueryAndMutationRecord extends QueryAndMutationRecordConstraints
> = {
  optimisticUpdate?: ({
    queryResource,
    mutationResource,
    mutationParams,
  }: {
    queryResource: ResourceRef<QueryAndMutationRecord['query']['state']>;
    mutationResource: ResourceRef<QueryAndMutationRecord['mutation']['state']>;
    mutationParams: NoInfer<QueryAndMutationRecord['mutation']['params']>;
  }) => NoInfer<QueryAndMutationRecord['query']['state']>;
  reload?: ReloadQueriesConfig<QueryAndMutationRecord>;
  /**
   * Will patch the query specific state with the mutation data.
   * If the query is loading, it will not patch.
   * If the mutation data is not compatible with the query state, it will not patch.
   * Be careful! If the mutation is already in a loading state, trigger the mutation again will cancelled the previous mutation loader and will patch with the new value.
   */
  optimisticPatch?: OptimisticPathMutationQuery<QueryAndMutationRecord>;
};

/**
 *
 * @param resourceName
 * @param queryFactory
 * @param options To help for type inference, you may always get the store as a parameter. Otherwise the mapResourceToState may be requested without the real needs
 * @example
 * ```ts
withQuery(
      'userDetails',
      (store) =>
        query(...),
      (store) => ({
        associatedClientState: {
          path: 'user',
        },
      })
    ),
 * ```
 * @returns
 */
export function withQuery<
  Input extends SignalStoreFeatureResult,
  const ResourceName extends string,
  ResourceState extends object | undefined,
  ResourceParams,
  ResourceArgsParams,
  QueryConfig extends ResourceWithParamsOrParamsFn<any, any, any>,
  const StoreInput extends Prettify<
    StateSignals<Input['state']> &
      Input['props'] &
      Input['methods'] &
      WritableStateSource<Prettify<Input['state']>>
  >,
  const ClientStateDottedPath extends ObjectDeepPath<Input['state']>,
  const ClientStateTypeByDottedPath extends AccessTypeObjectPropertyByDottedPath<
    Input['state'],
    ClientStateDottedPathTuple
  >,
  const ClientStateDottedPathTuple extends DottedPathPathToTuple<
    ClientStateDottedPath & string
  > = DottedPathPathToTuple<NoInfer<ClientStateDottedPath> & string>
>(
  resourceName: ResourceName,
  queryFactory: (store: StoreInput) => (
    store: StoreInput,
    context: Input
  ) => { queryConfig: QueryConfig } & {
    __types: InternalType<ResourceState, ResourceParams, ResourceArgsParams>;
  } & QueryBrand,
  optionsFactory?: (store: StoreInput) => {
    // Exclude path from the MergeObject, it will enable the const type inference, otherwise it will be inferred as string
    /**
     * Will update the state at the given path with the resource data.
     * If the type of targeted state does not match the type of the resource,
     * the mapResourceToState function is required.
     * - If the mapResourceToState is requested without the real needs, you may declare deliberately the store as a parameter of the option factory.
     */
    associatedClientState?: { path: NoInfer<ClientStateDottedPath> } & Prettify<
      MergeObject<
        {
          mapResourceToState?: MapResourceToState<
            NoInfer<ResourceState>,
            NoInfer<ResourceParams>,
            ClientStateTypeByDottedPath
          >;
        },
        NoInfer<ResourceState> extends ClientStateTypeByDottedPath
          ? {
              mapResourceToState?: MapResourceToState<
                NoInfer<ResourceState>,
                NoInfer<ResourceParams>,
                ClientStateTypeByDottedPath
              >;
            }
          : {
              mapResourceToState: MapResourceToState<
                NoInfer<ResourceState>,
                NoInfer<ResourceParams>,
                ClientStateTypeByDottedPath
              >;
            }
      >
    >;
    on?: Input['props'] extends {
      __mutation: infer Mutations;
    }
      ? {
          [key in keyof Mutations]?: Mutations[key] extends InternalType<
            infer MutationState,
            infer MutationParams,
            infer MutationArgsParams
          >
            ? QueryDeclarativeEffect<{
                query: InternalType<
                  ResourceState,
                  ResourceParams,
                  ResourceArgsParams
                >;
                mutation: InternalType<
                  MutationState,
                  MutationParams,
                  MutationArgsParams
                >;
              }>
            : never;
        }
      : never;
  }
): SignalStoreFeature<
  Input,
  WithQueryOutputStoreConfig<
    ResourceName,
    ResourceState,
    ResourceParams,
    ResourceArgsParams
  >
> {
  return ((context: SignalStoreFeatureResult) => {
    return signalStoreFeature(
      withProps((store) => {
        const queryConfigData = queryFactory(store as unknown as StoreInput)(
          store as unknown as StoreInput,
          context as unknown as Input
        );
        const queryResourceParamsFnSignal = signal<ResourceParams | undefined>(
          undefined
        );

        const resourceParamsSrc =
          queryConfigData.queryConfig.params ?? queryResourceParamsFnSignal;

        const queryResource = resource<ResourceState, ResourceParams>({
          ...queryConfigData.queryConfig,
          params: resourceParamsSrc,
        } as ResourceOptions<any, any>);

        const queryOptions = optionsFactory?.(store as unknown as StoreInput);

        return queryCoreOutput({
          resourceName,
          queryResource,
          store,
          queryResourceParamsFnSignal,
          queryOptions: queryOptions as any,
        });
      })
      //@ts-ignore
    )(context);
  }) as unknown as SignalStoreFeature<
    Input,
    WithQueryOutputStoreConfig<
      ResourceName,
      ResourceState,
      ResourceParams,
      ResourceArgsParams
    >
  >;
}

/**
 * Return the withQuery or withRxQuery output.
 * It is not used to handle query typing system.
 */
function queryCoreOutput({
  resourceName,
  queryResource,
  store,
  queryResourceParamsFnSignal,
  queryOptions,
}: {
  resourceName: string;
  queryResource: ResourceRef<unknown | undefined>;
  store: WritableStateSource<object>;
  queryResourceParamsFnSignal: Signal<any>;
  queryOptions?: {
    associatedClientState?: {
      path: string;
      mapResourceToState?: MapResourceToState<unknown, unknown, unknown>;
    };
    on?: Record<
      string,
      QueryDeclarativeEffect<{
        query: InternalType<unknown, unknown, unknown>;
        mutation: InternalType<unknown, unknown, unknown>;
      }>
    >;
  };
}) {
  const associatedClientState = queryOptions?.associatedClientState;

  const mutationsConfigEffect = Object.entries(
    (queryOptions?.on ?? {}) as Record<
      string,
      QueryDeclarativeEffect<QueryAndMutationRecordConstraints>
    >
  );

  return {
    [`${resourceName}Query`]: queryResource,
    ...(associatedClientState &&
      'path' in associatedClientState && {
        [`_${resourceName}Effect`]: effect(() => {
          if (!['resolved', 'local'].includes(queryResource.status())) {
            return;
          }
          patchState(store, (state) => {
            const resourceData = queryResource.hasValue()
              ? (queryResource.value() as unknown | undefined)
              : undefined;
            const path = associatedClientState?.path;
            const mappedResourceToState =
              'mapResourceToState' in associatedClientState
                ? associatedClientState.mapResourceToState({
                    queryResource: queryResource as ResourceRef<unknown>,
                    queryParams: queryResourceParamsFnSignal() as NonNullable<
                      NoInfer<unknown>
                    >,
                  })
                : resourceData;
            const keysPath = (path as string).split('.');
            const result = createNestedStateUpdate({
              state,
              keysPath,
              value: mappedResourceToState,
            });
            return result;
          });
        }),
      }),
    ...(mutationsConfigEffect.length &&
      mutationsConfigEffect.reduce(
        (acc, [mutationName, mutationEffectOptions]) => {
          return {
            ...acc,
            [`_on${mutationName}${resourceName}QueryEffect`]: effect(() => {
              const mutationResource = (store as any)[
                mutationName
              ] as ResourceRef<unknown>;
              const mutationStatus = mutationResource.status();
              const mutationParamsSrc = (store as any)['__mutation'][
                mutationName
              ].paramsSource as Signal<unknown>;

              if (mutationEffectOptions?.optimisticUpdate) {
                if (mutationStatus === 'loading') {
                  untracked(() => {
                    const optimisticValue =
                      mutationEffectOptions?.optimisticUpdate?.({
                        mutationResource,
                        queryResource,
                        mutationParams: mutationParamsSrc() as NonNullable<
                          NoInfer<unknown>
                        >,
                      });
                    queryResource.set(optimisticValue);
                  });
                }
              }
              if (mutationEffectOptions.reload) {
                const statusMappings = {
                  onMutationError: 'error',
                  onMutationResolved: 'resolved',
                  onMutationLoading: 'loading',
                };

                Object.entries(mutationEffectOptions.reload).forEach(
                  ([reloadType, reloadConfig]) => {
                    const expectedStatus =
                      statusMappings[reloadType as keyof typeof statusMappings];

                    if (expectedStatus && mutationStatus === expectedStatus) {
                      if (typeof reloadConfig === 'function') {
                        if (
                          reloadConfig({
                            queryResource,
                            mutationResource,
                            mutationParams: untracked(() =>
                              mutationParamsSrc()
                            ) as any,
                          })
                        ) {
                          queryResource.reload();
                        }
                      } else if (reloadConfig) {
                        queryResource.reload();
                      }
                    }
                  }
                );
              }
              if (mutationEffectOptions.optimisticPatch) {
                if (mutationStatus === 'loading') {
                  untracked(() => {
                    Object.entries(
                      mutationEffectOptions.optimisticPatch as unknown as Record<
                        string,
                        OptimisticPatchQueryFn<
                          unknown,
                          unknown,
                          unknown,
                          unknown,
                          unknown
                        >
                      >
                    ).forEach(([path, optimisticPatch]) => {
                      const queryValue = queryResource.hasValue()
                        ? queryResource.value()
                        : undefined;
                      console.log('queryValue', queryValue);
                      console.log(
                        'nestedValue',
                        getNestedStateValue({
                          state: queryValue,
                          keysPath: path.split('.'),
                        })
                      );
                      console.log('mutationParamsSrc()', mutationParamsSrc());
                      const optimisticValue = optimisticPatch({
                        mutationResource,
                        queryResource,
                        mutationParams: mutationParamsSrc() as NonNullable<
                          NoInfer<unknown>
                        >,
                        targetedState: getNestedStateValue({
                          state: queryValue,
                          keysPath: path.split('.'),
                        }),
                      });
                      console.log('optimisticValue', optimisticValue);

                      const updatedValue = createNestedStateUpdate({
                        state: queryValue,
                        keysPath: path.split('.'),
                        value: optimisticValue,
                      });
                      queryResource.set(updatedValue);
                    });
                  });
                }
              }
            }),
          };
        },
        {} as Record<`_on${string}${string}QueryEffect`, EffectRef>
      )),
  };
}

/**
 * Configures a query.
 * And optionally associates the query result to a client state.
 */
export function query<
  queryState extends object | undefined,
  queryParams,
  QueryArgsParams,
  Input extends SignalStoreFeatureResult,
  const StoreInput extends Prettify<
    StateSignals<Input['state']> &
      Input['props'] &
      Input['methods'] &
      WritableStateSource<Prettify<Input['state']>>
  >
>(
  queryConfig: ResourceWithParamsOrParamsFn<
    queryState,
    queryParams,
    QueryArgsParams
  >,
  clientState?: (
    /**
     * Only used to help type inference, not used in the actual implementation.
     */
    config: {
      state: NoInfer<queryState>;
      params: NoInfer<queryParams>;
    },
    /**
     * Only used to help type inference, not used in the actual implementation.
     */
    context: Input
  ) => {
    clientState?: {
      path?: string;
      mapResourceToState?: MapResourceToState<
        NoInfer<queryState>,
        NoInfer<queryParams>,
        any
      >;
    };
  }
): (
  store: StoreInput,
  context: Input
) => {
  queryConfig: ResourceWithParamsOrParamsFn<
    NoInfer<queryState>,
    NoInfer<queryParams>,
    NoInfer<QueryArgsParams>
  >;
  clientState?: {
    path: string;
    mapResourceToState?: MapResourceToState<
      NoInfer<queryState>,
      NoInfer<queryParams>,
      any
    >;
  };
  /**
   * Only used to help type inference, not used in the actual implementation.
   */
  __types: InternalType<
    NoInfer<queryState>,
    NoInfer<queryParams>,
    NoInfer<QueryArgsParams>
  >;
} & QueryBrand {
  return (store, context) => ({
    queryConfig,
    // clientState params are only used to help type inference
    clientState: clientState?.({} as any, {} as any).clientState as any,
    __types: {} as InternalType<
      NoInfer<queryState>,
      NoInfer<queryParams>,
      NoInfer<QueryArgsParams>
    >,
    [__QueryBrandSymbol]: undefined,
  });
}
