import {
  ResourceRef,
  ResourceStatus,
  Signal,
  WritableSignal,
  effect,
  untracked,
} from '@angular/core';
import {
  Prettify,
  SignalStoreFeature,
  signalStoreFeature,
  SignalStoreFeatureResult,
  StateSignals,
  withMethods,
  withProps,
  WritableStateSource,
} from '@ngrx/signals';
import { Merge } from '../../../util/types/merge';
import { InternalType, MergeObject } from './types/util.type';

import {
  createNestedStateUpdate,
  getNestedStateValue,
} from './core/update-state.util';
import {
  OptimisticPatchQueryFn,
  OptimisticPathMutationQuery,
  ReloadQueriesConfig,
  QueryAndMutationRecordConstraints,
  FilterQueryById,
  ResourceMethod,
} from './types/shared.type';
import { ResourceByIdRef } from './resource-by-id-signal-store';

export type MutationRef<ResourceState, ResourceParams, ParamsArgs> = {
  resource: ResourceRef<ResourceState | undefined>;
  resourceParamsSrc: WritableSignal<ResourceParams | undefined>;
  method: ResourceMethod<ParamsArgs, ResourceParams> | undefined;
};
type OptimisticMutationQuery<
  QueryAndMutationRecord extends QueryAndMutationRecordConstraints
> = (
  data: MergeObject<
    {
      queryResource: ResourceRef<QueryAndMutationRecord['query']['state']>;
      mutationResource: ResourceRef<
        NoInfer<QueryAndMutationRecord['mutation']['state']>
      >;
      mutationParams: NonNullable<
        NoInfer<QueryAndMutationRecord['mutation']['params']>
      >;
    },
    QueryAndMutationRecord['query']['isGroupedResource'] extends true
      ? { queryIdentifier: QueryAndMutationRecord['query']['groupIdentifier'] }
      : {}
  >
) => QueryAndMutationRecord['query']['state'];

type QueryImperativeEffect<
  QueryAndMutationRecord extends QueryAndMutationRecordConstraints
> = MergeObject<
  {
    /**
     * Will update the query state with the mutation data.
     * Be careful! If the mutation is already in a loading state, trigger the mutation again will cancelled the previous mutation loader and will patch with the new value.
     */
    optimistic?: OptimisticMutationQuery<QueryAndMutationRecord>;
    /**
     * Will reload the query when the mutation is in a specific state.
     * If not provided, it will reload the query onMutationResolved and onMutationError.
     * If the query is loading, it will not reload.
     */
    reload?: ReloadQueriesConfig<QueryAndMutationRecord>;
    /**
     * Will patch the query specific state with the mutation data.
     * If the query is loading, it will not patch.
     * If the mutation data is not compatible with the query state, it will not patch.
     * Be careful! If the mutation is already in a loading state, trigger the mutation again will cancelled the previous mutation loader and will patch with the new value.
     */
    optimisticPatch?: OptimisticPathMutationQuery<QueryAndMutationRecord>;
  },
  QueryAndMutationRecord['query']['isGroupedResource'] extends true
    ? {
        filter: FilterQueryById<QueryAndMutationRecord>;
      }
    : {}
>;

type QueriesMutation<
  Input extends SignalStoreFeatureResult,
  StoreInput extends Prettify<
    StateSignals<Input['state']> &
      Input['props'] &
      Input['methods'] &
      WritableStateSource<Prettify<Input['state']>>
  >,
  MutationState,
  MutationParams,
  MutationArgsParams
> = {
  queriesEffects?: Input['props'] extends {
    __query: infer Queries;
  }
    ? {
        [key in keyof Queries as `${key &
          string}${'isGroupedResource' extends keyof Queries[key]
          ? Queries[key]['isGroupedResource'] extends true
            ? 'QueryById'
            : 'Query'
          : never}`]?: QueryImperativeEffect<{
          query: {
            state: 'state' extends keyof Queries[key]
              ? Queries[key]['state']
              : never;
            params: 'params' extends keyof Queries[key]
              ? Queries[key]['params']
              : never;
            args: 'args' extends keyof Queries[key]
              ? Queries[key]['args']
              : never;
            isGroupedResource: 'isGroupedResource' extends keyof Queries[key]
              ? Queries[key]['isGroupedResource']
              : never;
            groupIdentifier: 'groupIdentifier' extends keyof Queries[key]
              ? Queries[key]['groupIdentifier']
              : never;
          };
          mutation: {
            state: MutationState;
            params: MutationParams;
            args: MutationArgsParams;
            isGroupedResource: false;
            groupIdentifier: unknown;
          };
        }>;
      }
    : never;
};

export type __InternalSharedMutationConfig<MutationName, State, Params, Args> =
  {
    [key in `${MutationName & string}Mutation`]: InternalType<
      State,
      Params,
      Args,
      false
    > & {
      paramsSource: Signal<Params>;
    };
  };

type MutationStoreOutput<
  MutationName extends string,
  MutationState,
  MutationParams,
  MutationArgsParams
> = {
  state: {};
  props: Merge<
    {
      [key in `${MutationName}Mutation`]: ResourceRef<MutationState>;
    },
    {
      /**
       * Used to help for type inference, and access to the mutation resource params source
       */
      __mutation: __InternalSharedMutationConfig<
        MutationName,
        MutationState,
        MutationParams,
        MutationArgsParams
      >;
    }
  >;
  // todo add only if there is a mutation  fn and MutationArgsParams
  methods: {
    [key in MutationName as `mutate${Capitalize<key>}`]: (
      mutationParams: MutationArgsParams
    ) => MutationParams;
  };
};
export function withMutation<
  Input extends SignalStoreFeatureResult,
  const StoreInput extends Prettify<
    StateSignals<Input['state']> &
      Input['props'] &
      Input['methods'] &
      WritableStateSource<Prettify<Input['state']>>
  >,
  const MutationName extends string,
  ResourceState extends object | undefined,
  ResourceParams,
  ResourceArgsParams
>(
  mutationName: MutationName,
  mutationFactory: (store: StoreInput) => (
    store: StoreInput,
    context: Input
  ) => {
    mutationRef: MutationRef<
      NoInfer<ResourceState>,
      NoInfer<ResourceParams>,
      NoInfer<ResourceArgsParams>
    >;
  } & {
    __types: InternalType<
      ResourceState,
      ResourceParams,
      ResourceArgsParams,
      false
    >;
  },
  queriesEffectsFn?: (
    store: StoreInput
  ) => QueriesMutation<
    Input,
    StoreInput,
    NoInfer<ResourceState>,
    NoInfer<ResourceParams>,
    NoInfer<ResourceArgsParams>
  >
): SignalStoreFeature<
  Input,
  MutationStoreOutput<
    MutationName,
    ResourceState,
    ResourceParams,
    ResourceArgsParams
  >
> {
  return ((context: SignalStoreFeatureResult) => {
    const capitalizedMutationName =
      mutationName.charAt(0).toUpperCase() + mutationName.slice(1);

    return signalStoreFeature(
      withProps((store) => {
        const mutationConfigData = mutationFactory(
          store as unknown as StoreInput
        )(store as unknown as StoreInput, context as unknown as Input);

        const mutationResourceParamsSrc =
          mutationConfigData.mutationRef.resourceParamsSrc;

        const mutationResource = mutationConfigData.mutationRef.resource;

        const queriesMutation = (queriesEffectsFn?.(
          store as unknown as StoreInput
        )?.queriesEffects ?? {}) as Record<string, QueryImperativeEffect<any>>;

        const queriesWithOptimisticMutation = Object.entries(
          queriesMutation
        ).filter(([, queryMutationConfig]) => queryMutationConfig.optimistic);
        const queriesWithOptimisticPatch = Object.entries(
          queriesMutation
        ).filter(
          ([, queryMutationConfig]) => queryMutationConfig.optimisticPatch
        );
        const queriesWithReload = Object.entries(queriesMutation).filter(
          ([, queryMutationConfig]) => queryMutationConfig.reload
        );

        const hasQueriesEffects =
          queriesWithOptimisticMutation.length ||
          queriesWithOptimisticPatch.length ||
          queriesWithReload.length;

        return {
          // todo name it mutationName Mutation (same for query)
          [`${mutationName}Mutation`]: mutationResource,
          ...(hasQueriesEffects && {
            [`_${mutationName}Effect`]: effect(() => {
              const mutationStatus = mutationResource.status();
              const mutationValueChange = mutationResource.hasValue()
                ? mutationResource.value()
                : undefined;

              const mutationParamsChange = mutationResourceParamsSrc();

              untracked(() => {
                // Handle optimistic updates on loading
                setOptimisticQueryValues<ResourceState, ResourceParams>({
                  mutationStatus,
                  queriesWithOptimisticMutation,
                  store: store as any,
                  mutationResource:
                    mutationResource as ResourceRef<ResourceState>,
                  resourceParamsSrc: mutationResourceParamsSrc,
                });
              });

              // Handle optimistic patch
              untracked(() => {
                setOptimisticPatchQueriesValue({
                  mutationStatus,
                  queriesWithOptimisticPatch,
                  store: store as any,
                  mutationResource,
                  resourceParamsSrc: mutationResourceParamsSrc,
                });
              });
              // Handle reload queries
              untracked(() => {
                reloadQueriesOnMutationChange<ResourceState, ResourceParams>({
                  queriesWithReload,
                  store: store as any,
                  mutationStatus,
                  resourceParamsSrc: mutationResourceParamsSrc,
                  mutationResource:
                    mutationResource as ResourceRef<ResourceState>,
                });
              });
            }),
          }),
          __mutation: {
            [`${mutationName}Mutation`]: {
              paramsSource: mutationResourceParamsSrc,
            },
          },
        };
      }),
      withMethods((store) => {
        // ! only used to get the method (do not used to get the src because, it will regenerate the mutation)
        const mutationResourceOption = mutationFactory(
          store as unknown as StoreInput
        )(store as unknown as StoreInput, context as unknown as Input);
        const mutationConfig = mutationResourceOption.mutationRef;
        return {
          [`mutate${capitalizedMutationName}`]: (
            mutationParams: ResourceArgsParams
          ) => {
            const mutationMethod = mutationConfig.method;
            if (mutationMethod) {
              const mutationParamsResult = mutationMethod(mutationParams);
              store.__mutation[`${mutationName}Mutation`].paramsSource.set(
                mutationParamsResult as ResourceParams
              );
            }
          },
        };
      })
      //@ts-ignore
    )(context);
  }) as unknown as SignalStoreFeature<
    Input,
    MutationStoreOutput<
      MutationName,
      ResourceState,
      ResourceParams,
      ResourceArgsParams
    >
  >;
}
function reloadQueriesOnMutationChange<
  ResourceState extends object | undefined,
  ResourceParams
>({
  queriesWithReload,
  store,
  mutationStatus,
  mutationResource,
  resourceParamsSrc,
}: {
  queriesWithReload: [string, QueryImperativeEffect<any>][];
  store: WritableSignal<any>;
  mutationStatus: string;
  mutationResource: ResourceRef<ResourceState>;
  resourceParamsSrc: () => any;
}) {
  queriesWithReload.forEach(([queryName, queryMutationConfig]) => {
    const queryTargeted = (store as any)[queryName] as
      | ResourceRef<any>
      | ResourceByIdRef<string | number, any>;

    if ('hasValue' in queryTargeted) {
      const queryResource = queryTargeted;
      if (queryMutationConfig.reload) {
        const statusMappings = {
          onMutationError: 'error',
          onMutationResolved: 'resolved',
          onMutationLoading: 'loading',
        };

        Object.entries(queryMutationConfig.reload).forEach(
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
                      resourceParamsSrc()
                    ) as NonNullable<NoInfer<ResourceParams>>,
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
    } else {
      Object.entries((queryTargeted as ResourceByIdRef<string | number, any>)())
        .filter(([queryIdentifier, queryResource]) => {
          if (!('filter' in queryMutationConfig)) {
            return true;
          }
          return queryMutationConfig.filter({
            queryIdentifier: queryIdentifier as string | number,
            queryResource: queryResource as ResourceRef<any>,
            mutationResource,
            mutationParams: untracked(() => resourceParamsSrc()) as NonNullable<
              NoInfer<ResourceParams>
            >,
          });
        })
        .forEach(([queryIdentifier, queryResource]) => {
          if (queryMutationConfig.reload) {
            const statusMappings = {
              onMutationError: 'error',
              onMutationResolved: 'resolved',
              onMutationLoading: 'loading',
            };

            Object.entries(queryMutationConfig.reload).forEach(
              ([reloadType, reloadConfig]) => {
                const expectedStatus =
                  statusMappings[reloadType as keyof typeof statusMappings];
                if (expectedStatus && mutationStatus === expectedStatus) {
                  if (typeof reloadConfig === 'function') {
                    if (
                      reloadConfig({
                        queryResource: queryResource as ResourceRef<any>,
                        mutationResource,
                        mutationParams: untracked(() =>
                          resourceParamsSrc()
                        ) as NonNullable<NoInfer<ResourceParams>>,
                      })
                    ) {
                      queryResource?.reload();
                    }
                  } else if (reloadConfig) {
                    queryResource?.reload();
                  }
                }
              }
            );
          }
        });
    }
  });
}

function setOptimisticPatchQueriesValue<
  ResourceState extends object | undefined,
  ResourceParams,
  ResourceArgsParams
>({
  mutationStatus,
  queriesWithOptimisticPatch,
  store,
  mutationResource,
  resourceParamsSrc,
}: {
  mutationStatus: ResourceStatus;
  queriesWithOptimisticPatch: [string, QueryImperativeEffect<any>][];
  store: WritableSignal<any>;
  mutationResource: ResourceRef<ResourceState>;
  resourceParamsSrc: () => any;
}) {
  if (mutationStatus === 'loading') {
    queriesWithOptimisticPatch.forEach(([queryName, queryMutationConfig]) => {
      const queryTargeted = (store as any)[queryName] as
        | ResourceRef<any>
        | ResourceByIdRef<string | number, any>;
      if ('hasValue' in queryTargeted) {
        optimisticPatchQueryResource<
          ResourceState,
          ResourceParams,
          ResourceArgsParams
        >({
          queryResource: queryTargeted,
          queryMutationConfig,
          mutationResource,
          resourceParamsSrc,
        });
      } else {
        // use the filter to get the queries to update
        Object.entries(
          (queryTargeted as ResourceByIdRef<string | number, any>)()
        )
          .filter(([queryIdentifier, queryResource]) => {
            if (!('filter' in queryMutationConfig)) {
              return true;
            }
            return queryMutationConfig.filter({
              queryIdentifier: queryIdentifier as string | number,
              queryResource: queryResource as ResourceRef<any>,
              mutationResource,
              mutationParams: untracked(() =>
                resourceParamsSrc()
              ) as NonNullable<NoInfer<ResourceParams>>,
            });
          })
          .forEach(([queryIdentifier, queryResource]) => {
            optimisticPatchQueryResource<
              ResourceState,
              ResourceParams,
              ResourceArgsParams
            >({
              queryResource: queryResource as ResourceRef<any>,
              queryMutationConfig,
              mutationResource,
              resourceParamsSrc,
            });
          });
      }
    });
  }
}

function setOptimisticQueryValues<
  ResourceState extends object | undefined,
  ResourceParams
>({
  mutationStatus,
  queriesWithOptimisticMutation,
  store,
  mutationResource,
  resourceParamsSrc,
}: {
  mutationStatus: ResourceStatus;
  queriesWithOptimisticMutation: [string, QueryImperativeEffect<any>][];
  store: WritableSignal<any>;
  mutationResource: ResourceRef<ResourceState>;
  resourceParamsSrc: () => any;
}) {
  if (mutationStatus === 'loading') {
    queriesWithOptimisticMutation.forEach(
      ([queryName, queryMutationConfig]) => {
        const queryTargeted = (store as any)[queryName] as
          | ResourceRef<any>
          | ResourceByIdRef<string | number, any>;
        if ('hasValue' in queryTargeted) {
          const queryResource = queryTargeted;
          const optimisticValue = queryMutationConfig?.optimistic?.({
            mutationResource,
            queryResource,
            mutationParams: resourceParamsSrc() as NonNullable<
              NoInfer<ResourceParams>
            >,
          });
          queryResource.set(optimisticValue);
        } else {
          // use the filter to get the queries to update
          Object.entries(
            (queryTargeted as ResourceByIdRef<string | number, any>)()
          )
            .filter(([queryIdentifier, queryResource]) => {
              if (!('filter' in queryMutationConfig)) {
                return true;
              }
              return queryMutationConfig.filter({
                queryIdentifier: queryIdentifier as string | number,
                queryResource: queryResource as ResourceRef<any>,
                mutationResource,
                mutationParams: resourceParamsSrc() as NonNullable<
                  NoInfer<ResourceParams>
                >,
              });
            })
            .forEach(([queryIdentifier, queryResource]) => {
              const optimisticValue = queryMutationConfig.optimistic?.({
                mutationResource,
                queryResource: queryResource as ResourceRef<any>,
                mutationParams: resourceParamsSrc() as NonNullable<
                  NoInfer<ResourceParams>
                >,
              });
              queryResource?.set(optimisticValue);
            });
        }
      }
    );
  }
}

function optimisticPatchQueryResource<
  ResourceState extends object | undefined,
  ResourceParams,
  ResourceArgsParams
>({
  queryResource,
  queryMutationConfig,
  mutationResource,
  resourceParamsSrc,
}: {
  queryResource: ResourceRef<any>;
  queryMutationConfig: QueryImperativeEffect<any>;
  mutationResource: ResourceRef<ResourceState>;
  resourceParamsSrc: () => any;
}) {
  Object.entries(
    queryMutationConfig.optimisticPatch as Record<
      string,
      OptimisticPatchQueryFn<
        any,
        ResourceState,
        ResourceParams,
        ResourceArgsParams,
        any
      >
    >
  ).forEach(([path, optimisticPatch]) => {
    const queryValue = queryResource.hasValue()
      ? queryResource.value()
      : undefined;
    const optimisticValue = optimisticPatch({
      mutationResource,
      queryResource,
      mutationParams: resourceParamsSrc() as NonNullable<
        NoInfer<ResourceParams>
      >,
      targetedState: getNestedStateValue({
        state: queryValue,
        keysPath: path.split('.'),
      }),
    });

    const updatedValue = createNestedStateUpdate({
      state: queryValue,
      keysPath: path.split('.'),
      value: optimisticValue,
    });
    queryResource.set(updatedValue);
  });
}
