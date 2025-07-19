import {
  ResourceLoader,
  ResourceOptions,
  ResourceRef,
  effect,
  resource,
  signal,
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
import { MergeObject } from './types/util.type';

import {
  createNestedStateUpdate,
  getNestedStateValue,
} from './update-state.util';
import { ResourceWithParamsOrParamsFn } from './types/resource-with-params-or-params-fn.type';
import { ObjectDeepPath } from './types/object-deep-path-mapper.type';
import {
  AccessTypeObjectPropertyByDottedPath,
  DottedPathPathToTuple,
} from './types/access-type-object-property-by-dotted-path.type';

declare const __MutationBrandSymbol: unique symbol;

type OptimisticMutationQuery<
  QueryState,
  MutationState,
  MutationParams,
  MutationArgsParams
> = (data: {
  queryResource: ResourceRef<QueryState>;
  mutationResource: ResourceRef<NoInfer<MutationState>>;
  mutationParams: NonNullable<NoInfer<MutationParams>>;
}) => QueryState;

type CustomReloadOnSpecificMutationStatus<
  QueryState,
  MutationState,
  MutationParams,
  MutationArgsParams
> = (data: {
  queryResource: ResourceRef<QueryState>;
  mutationResource: ResourceRef<NoInfer<MutationState>>;
  mutationParams: NonNullable<NoInfer<MutationParams>>;
}) => boolean;

// ? OptimisticMutationEnum<QueryState, MutationState>['boolean'] // can not be boolean, because MutationState does not expose a params
// : ;

type ReloadQueriesConfig<
  QueryState,
  MutationState,
  MutationParams,
  MutationArgsParams
> =
  | false
  | {
      onMutationError?:
        | boolean
        | CustomReloadOnSpecificMutationStatus<
            QueryState,
            MutationState,
            MutationParams,
            MutationArgsParams
          >;
      onMutationResolved?:
        | boolean
        | CustomReloadOnSpecificMutationStatus<
            QueryState,
            MutationState,
            MutationParams,
            MutationArgsParams
          >;
      onMutationLoading?:
        | boolean
        | CustomReloadOnSpecificMutationStatus<
            QueryState,
            MutationState,
            MutationParams,
            MutationArgsParams
          >;
    };

type OptimisticPatchQueryFn<
  QueryState,
  MutationState,
  MutationParams,
  MutationArgsParams,
  TargetedType
> = (data: {
  queryResource: NoInfer<ResourceRef<QueryState>>;
  mutationResource: NoInfer<ResourceRef<MutationState>>;
  mutationParams: NonNullable<NoInfer<MutationParams>>;
  targetedState: TargetedType | undefined;
}) => TargetedType;

type OptimisticPathMutationQuery<
  QueryState,
  MutationState,
  MutationParams,
  MutationArgsParams
> = QueryState extends object
  ? {
      [queryPatchPath in ObjectDeepPath<QueryState>]?: AccessTypeObjectPropertyByDottedPath<
        QueryState,
        DottedPathPathToTuple<queryPatchPath>
      > extends infer TargetedType
        ? OptimisticPatchQueryFn<
            QueryState,
            MutationState,
            MutationParams,
            MutationArgsParams,
            TargetedType
          >
        : never;
    }
  : never;

type QueryEffect<
  QueryState,
  MutationState,
  MutationParams,
  MutationArgsParams
> = {
  /**
   * Will update the query state with the mutation data.
   * Be careful! If the mutation is already in a loading state, trigger the mutation again will cancelled the previous mutation loader and will patch with the new value.
   */
  optimistic?: OptimisticMutationQuery<
    QueryState,
    MutationState,
    MutationParams,
    MutationArgsParams
  >;
  /**
   * Will reload the query when the mutation is in a specific state.
   * If not provided, it will reload the query onMutationResolved and onMutationError.
   * If the query is loading, it will not reload.
   */
  reload?: ReloadQueriesConfig<
    QueryState,
    MutationState,
    MutationParams,
    MutationArgsParams
  >;
  /**
   * Will patch the query specific state with the mutation data.
   * If the query is loading, it will not patch.
   * If the mutation data is not compatible with the query state, it will not patch.
   * Be careful! If the mutation is already in a loading state, trigger the mutation again will cancelled the previous mutation loader and will patch with the new value.
   */
  optimisticPatch?: OptimisticPathMutationQuery<
    QueryState,
    MutationState,
    MutationParams,
    MutationArgsParams
  >;
};

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
        [key in keyof Queries]?: QueryEffect<
          Queries[key],
          MutationState,
          MutationParams,
          MutationArgsParams
        >;
      }
    : never;
};

/**
 * Configures a query.
 * And optionally associates the query result to a client state.
 */
export function mutation<
  mutationState extends object | undefined,
  mutationParams,
  MutationArgsParams,
  Input extends SignalStoreFeatureResult,
  const StoreInput extends Prettify<
    StateSignals<Input['state']> &
      Input['props'] &
      Input['methods'] &
      WritableStateSource<Prettify<Input['state']>>
  >
>(
  mutationConfig: ResourceWithParamsOrParamsFn<
    mutationState,
    mutationParams,
    MutationArgsParams
  >
): (
  store: StoreInput,
  context: Input
) => {
  mutationConfig: ResourceWithParamsOrParamsFn<
    NoInfer<mutationState>,
    NoInfer<mutationParams>,
    NoInfer<MutationArgsParams>
  >;
  /**
   * Only used to help type inference, not used in the actual implementation.
   */
  __types: {
    mutationState: NoInfer<mutationState>;
    mutationParams: NoInfer<mutationParams>;
    mutationArgsParams: NoInfer<MutationArgsParams>;
  };
} {
  return (store, context) => ({
    mutationConfig: mutationConfig,
    __types: {
      mutationState: {} as NoInfer<mutationState>,
      mutationParams: {} as NoInfer<mutationParams>,
      mutationArgsParams: {} as NoInfer<MutationArgsParams>,
    },
  });
}

type MutationStoreOutput<
  MutationName extends string,
  MutationState,
  ResourceParams,
  MutationArgsParams
> = {
  state: {};
  props: Merge<
    {
      [key in MutationName]: ResourceRef<MutationState>;
    },
    {
      /**
       * Does not exist, it is only used by the typing system to infer
       */
      __mutation: {
        [key in MutationName]: MutationState;
      };
    }
  >;
  // todo add only if there is a mutation  fn and MutationArgsParams
  methods: {
    [key in MutationName as `mutate${Capitalize<key>}`]: (
      mutationParams: MutationArgsParams
    ) => ResourceParams;
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
  ResourceArgsParams,
  MutationConfig extends ResourceWithParamsOrParamsFn<any, any, any>
>(
  mutationName: MutationName,
  mutationFactory: (store: StoreInput) => (
    store: StoreInput,
    context: Input
  ) => { mutationConfig: MutationConfig } & {
    __types: {
      mutationState: ResourceState;
      mutationParams: ResourceParams;
      mutationArgsParams: ResourceArgsParams;
    };
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

    // mutationResourceParamsFnSignal will be used has params signal to trigger the mutation loader
    const mutationResourceParamsFnSignal = signal<ResourceParams | undefined>(
      undefined
    );

    return signalStoreFeature(
      withProps((store) => {
        const mutationResourceOption = mutationFactory(
          store as unknown as StoreInput
        )(store as unknown as StoreInput, context as unknown as Input);
        const mutationConfig = mutationResourceOption.mutationConfig;

        const resourceParamsSrc =
          mutationConfig.params ?? mutationResourceParamsFnSignal;

        const mutationResource = resource<ResourceState, ResourceParams>({
          ...mutationResourceOption.mutationConfig,
          params: resourceParamsSrc,
        } as any);

        const queriesMutation = (queriesEffectsFn?.(
          store as unknown as StoreInput
        )?.queriesEffects ?? {}) as Record<
          string,
          QueryEffect<any, ResourceState, ResourceParams, ResourceArgsParams>
        >;

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
          [mutationName]: mutationResource,
          ...(hasQueriesEffects && {
            [`_${mutationName}Effect`]: effect(() => {
              const mutationStatus = mutationResource.status();
              const mutationParamsChange = resourceParamsSrc();

              untracked(() => {
                // Handle optimistic updates on loading
                if (mutationStatus === 'loading') {
                  queriesWithOptimisticMutation.forEach(
                    ([queryName, queryMutationConfig]) => {
                      const queryResource = (store as any)[
                        queryName
                      ] as ResourceRef<any>;

                      const optimisticValue = queryMutationConfig?.optimistic?.(
                        {
                          mutationResource,
                          queryResource,
                          mutationParams: resourceParamsSrc() as NonNullable<
                            NoInfer<ResourceParams>
                          >,
                        }
                      );

                      if (!queryResource.isLoading()) {
                        queryResource.set(optimisticValue);
                      }
                    }
                  );
                }
              });

              // Handle optimistic patch
              untracked(() => {
                if (mutationStatus === 'loading') {
                  queriesWithOptimisticPatch.forEach(
                    ([queryName, queryMutationConfig]) => {
                      const queryResource = (store as any)[
                        queryName
                      ] as ResourceRef<any>;
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

                        if (!queryResource.isLoading()) {
                          const updatedValue = createNestedStateUpdate({
                            state: queryValue,
                            keysPath: path.split('.'),
                            value: optimisticValue,
                          });
                          queryResource.set(updatedValue);
                        }
                      });
                    }
                  );
                }
              });
              // Handle reload queries
              untracked(() => {
                queriesWithReload.forEach(
                  ([queryName, queryMutationConfig]) => {
                    const queryResource = (store as any)[
                      queryName
                    ] as ResourceRef<any>;

                    if (queryMutationConfig.reload) {
                      const statusMappings = {
                        onMutationError: 'error',
                        onMutationResolved: 'resolved',
                        onMutationLoading: 'loading',
                      };

                      Object.entries(queryMutationConfig.reload).forEach(
                        ([reloadType, reloadConfig]) => {
                          const expectedStatus =
                            statusMappings[
                              reloadType as keyof typeof statusMappings
                            ];

                          if (
                            expectedStatus &&
                            mutationStatus === expectedStatus
                          ) {
                            if (typeof reloadConfig === 'function') {
                              if (
                                reloadConfig({
                                  queryResource,
                                  mutationResource,
                                  mutationParams: untracked(() =>
                                    mutationResourceParamsFnSignal()
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
                  }
                );
              });
            }),
          }),
        };
      }),
      withMethods((store) => ({
        [`mutate${capitalizedMutationName}`]: (
          mutationParams: ResourceArgsParams
        ) => {
          const mutationResourceOption = mutationFactory(
            store as unknown as StoreInput
          )(store as unknown as StoreInput, context as unknown as Input);
          const mutationConfig = mutationResourceOption.mutationConfig;

          const mutationMethod = mutationConfig.method;
          if (mutationMethod) {
            const mutationParamsResult = mutationMethod(mutationParams);

            mutationResourceParamsFnSignal.set(
              mutationParamsResult as ResourceParams
            );
          }
        },
      }))
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
