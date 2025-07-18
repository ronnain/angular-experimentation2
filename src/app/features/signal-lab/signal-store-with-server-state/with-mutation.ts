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
  targetedState: TargetedType;
}) => TargetedType;

type OptimisticPathMutationQuery<
  QueryState,
  MutationState,
  MutationParams,
  MutationArgsParams
> = {
  [queryPatchPath in ObjectDeepPath<
    QueryState & {}
  >]?: AccessTypeObjectPropertyByDottedPath<
    QueryState & {},
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
};

type QueryEffect<
  QueryState,
  MutationState,
  MutationParams,
  MutationArgsParams,
  DeepPath extends ObjectDeepPath<NoInfer<QueryState> & {}> = ObjectDeepPath<
    NoInfer<QueryState> & {}
  >
> = {
  // test1: NoInfer<MutationState>;
  // test: NoInfer<(data: NoInfer<MutationState>) => boolean>;
  // test2: (data: NoInfer<MutationParams>) => boolean;
  // test?: NoInfer<MutationState>;
  /**
   * Will update the query state with the mutation data.
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
   */
  optimisticPatch?: Prettify<
    OptimisticPathMutationQuery<
      QueryState,
      MutationState,
      MutationParams,
      MutationArgsParams
    >
  >;
  testPath?: Prettify<DeepPath>;
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
  queries?: Input['props'] extends {
    __query: infer Queries;
  }
    ? {
        [key in keyof Queries]?: (
          store: StoreInput,
          context: Input,
          __mutationTypes: {
            state: NoInfer<MutationState>;
            params: NoInfer<MutationParams>;
            args: NoInfer<MutationArgsParams>;
          },
          __queryTypes: {
            state: Queries[key];
          },
          queryPath: Queries[key] extends object
            ? ObjectDeepPath<NoInfer<Queries[key]>>
            : never
        ) => any;
        //   QueryEffect<
        //   Queries[key], // todo return infer type from ResourceRef<Queries[key]>,
        //   MutationState,
        //   MutationParams,
        //   MutationArgsParams
        // >;
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
    ) => void;
  };
};

// export function queryEffect<
//   Input extends SignalStoreFeatureResult,
//   const StoreInput extends Prettify<
//     StateSignals<Input['state']> &
//       Input['props'] &
//       Input['methods'] &
//       WritableStateSource<Prettify<Input['state']>>
//   >,
//   QueryState,
//   QueryTypes extends {
//     state: QueryState;
//   },
//   MutationState,
//   MutationParams,
//   MutationArgsParams,
//   MutationType extends {
//     state: MutationState;
//     params: MutationParams;
//     args: MutationArgsParams;
//   }
// >(queryEffect?: //  QueryEffect<
// //   NoInfer<QueryTypes['state']>,
// //   NoInfer<MutationType['state']>,
// //   NoInfer<MutationType['params']>,
// //   NoInfer<MutationType['args']>
// // > &
// {
//   test: NoInfer<QueryTypes['state']>;
// }) {
//   // todo add __queryTypes to withMutation and harmoniser MutationConfig properties
//   return (
//     store: StoreInput,
//     context: Input,
//     __mutationTypes: MutationType,
//     __queryTypes: QueryTypes
//   ) => queryEffect;
// }

export function queryEffect2<
  QueryPath,
  Input extends SignalStoreFeatureResult,
  const StoreInput extends Prettify<
    StateSignals<Input['state']> &
      Input['props'] &
      Input['methods'] &
      WritableStateSource<Prettify<Input['state']>>
  >,
  QueryState,
  QueryTypes extends {
    state: QueryState;
  },
  MutationState,
  MutationParams,
  MutationArgsParams,
  MutationType extends {
    state: MutationState;
    params: MutationParams;
    args: MutationArgsParams;
  }
>(path: NoInfer<QueryPath>) {
  return (
    store: StoreInput,
    context: Input,
    mutationTypes: MutationType,
    queryTypes: QueryTypes,
    queryPath: QueryPath
  ) => {};
}

// todo withQuery... faire un state initial qui représente l'état et sera muté par la mutation, et préserver la réponse de la query dans un champs spécifique readonly

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
  test?: (
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
  MutationStoreOutput<MutationName, ResourceState, ResourceArgsParams>
> {
  return ((context: SignalStoreFeatureResult) => {
    const capitalizedMutationName =
      mutationName.charAt(0).toUpperCase() + mutationName.slice(1);

    const mutationResourceParamsFnSignal = signal<ResourceParams | undefined>(
      undefined
    );

    return signalStoreFeature(
      withProps((store) => {
        const mutationResourceOption = mutationFactory(
          store as unknown as StoreInput
        )(store as unknown as StoreInput, context as unknown as Input);
        const mutationConfig = mutationResourceOption.mutationConfig;
        // resourceParamsFnSignal will be used has params signal to trigger the mutation loader

        const resourceParamsSrc =
          mutationConfig.params ?? mutationResourceParamsFnSignal;

        const mutationResource = resource<ResourceState, ResourceParams>({
          ...mutationResourceOption.mutationConfig,
          params: resourceParamsSrc,
        } as any);

        const queriesMutation = mutationResourceOption.queries
          ? mutationResourceOption.queries
          : ({} as Record<
              string,
              QueryEffect<
                any,
                ResourceState,
                ResourceParams,
                ResourceArgsParams
              >
            >);
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

        console.log('mutationResource', mutationResource);
        effect(() =>
          console.log(
            'mutationResource effect',
            mutationResource.hasValue()
              ? mutationResource.value()
              : mutationResource.error()
          )
        );

        return {
          // todo name it mutationName Mutation (same for query)
          [mutationName]: mutationResource,
          ...('queries' in mutationConfig && {
            [`_${mutationName}Effect`]: effect(() => {
              const mutationStatus = mutationResource.status();
              console.log('mutationStatus', mutationStatus);

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
                          targetedState: getNestedStateValue({
                            state: queryValue,
                            keysPath: path.split('.'),
                          }),
                        });

                        if (!queryResource.isLoading()) {
                          queryResource.set(
                            createNestedStateUpdate({
                              state: queryValue,
                              keysPath: path.split('.'),
                              value: optimisticValue,
                            })
                          );
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

            console.log('mutationParamsResult', mutationParamsResult);
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
    MutationStoreOutput<MutationName, ResourceState, ResourceArgsParams>
  >;
}
