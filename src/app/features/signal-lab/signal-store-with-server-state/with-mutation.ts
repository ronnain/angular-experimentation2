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

type LinkedQueryConfig<
  QueryState,
  MutationState,
  MutationParams,
  MutationArgsParams
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
  optimisticPatch?: OptimisticPathMutationQuery<
    QueryState,
    MutationState,
    MutationParams,
    MutationArgsParams
  >;
};

type QueriesMutation<
  Input extends SignalStoreFeatureResult,
  MutationState,
  MutationParams,
  MutationArgsParams
> = {
  queries?: Input['props'] extends {
    __query: infer Queries;
  }
    ? {
        [key in keyof Queries]?: LinkedQueryConfig<
          Queries[key],
          MutationState,
          MutationParams,
          MutationArgsParams
        >;
      }
    : never;
};

/**
 * Mainly used to preserve the TS typing system
 */
export function mutation<
  Input extends SignalStoreFeatureResult,
  MutationState extends object | undefined,
  MutationParams,
  MutationArgsParams
>(
  mutationResourceConfig: ResourceWithParamsOrParamsFn<
    Input,
    MutationState,
    MutationParams,
    MutationArgsParams
  >
): ResourceWithParamsOrParamsFn<
  Input,
  MutationState,
  MutationParams,
  MutationArgsParams
> & {
  [__MutationBrandSymbol]: unknown;
} {
  return mutationResourceConfig as ResourceWithParamsOrParamsFn<
    Input,
    MutationState,
    MutationParams,
    MutationArgsParams
  > & {
    [__MutationBrandSymbol]: unknown;
  };
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

/**
 * No idea why this is needed, but without that the MutationState can not be passed as input, in query optimistic functions.
 * Please add it after the mutation property
 */
export function tsTypeHelper() {
  return <StateToSave>(_: StateToSave): void => {
    console.log('_', _);
  };
}

// todo withQuery... faire un state initial qui représente l'état et sera muté par la mutation, et préserver la réponse de la query dans un champs spécifique readonly

export function withMutation<
  Input extends SignalStoreFeatureResult,
  const MutationName extends string,
  MutationState extends object | undefined,
  MutationParams,
  MutationArgsParams
>(
  mutationName: MutationName,
  mutationConfig: MergeObject<
    {
      mutation: ResourceWithParamsOrParamsFn<
        Input,
        MutationState,
        MutationParams,
        MutationArgsParams
      >;
    },
    QueriesMutation<Input, MutationState, MutationParams, MutationArgsParams>
  >
): SignalStoreFeature<
  Input,
  MutationStoreOutput<MutationName, MutationState, MutationArgsParams>
> {
  return ((store: SignalStoreFeatureResult) => {
    // todo rename to mutationConfig

    const mutationResourceOption = mutationConfig.mutation;

    // resourceParamsFnSignal will be used has params signal to trigger the mutation loader
    const mutationResourceParamsFnSignal = signal<MutationParams | undefined>(
      undefined
    );

    const resourceParamsSrc =
      mutationResourceOption.params?.(store as any) ??
      mutationResourceParamsFnSignal;

    const mutationResource = resource<MutationState, MutationParams>({
      ...mutationResourceOption,
      params: resourceParamsSrc,
    } as any);

    const queriesMutation =
      typeof mutationConfig === 'object' && 'queries' in mutationConfig
        ? mutationConfig.queries
        : ({} as Record<
            string,
            LinkedQueryConfig<
              any,
              MutationState,
              MutationParams,
              MutationArgsParams
            >
          >);
    const queriesWithOptimisticMutation = Object.entries(
      queriesMutation
    ).filter(([, queryMutationConfig]) => queryMutationConfig.optimistic);
    const queriesWithOptimisticPatch = Object.entries(queriesMutation).filter(
      ([, queryMutationConfig]) => queryMutationConfig.optimisticPatch
    );
    const queriesWithReload = Object.entries(queriesMutation).filter(
      ([, queryMutationConfig]) => queryMutationConfig.reload
    );

    const capitalizedMutationName =
      mutationName.charAt(0).toUpperCase() + mutationName.slice(1);

    return signalStoreFeature(
      withProps((store) => ({
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
                    const optimisticValue = queryMutationConfig?.optimistic?.({
                      mutationResource,
                      queryResource,
                      mutationParams: resourceParamsSrc() as NonNullable<
                        NoInfer<MutationParams>
                      >,
                    });

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
                          MutationState,
                          MutationParams,
                          MutationArgsParams,
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
              queriesWithReload.forEach(([queryName, queryMutationConfig]) => {
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

                      if (expectedStatus && mutationStatus === expectedStatus) {
                        if (typeof reloadConfig === 'function') {
                          if (
                            reloadConfig({
                              queryResource,
                              mutationResource,
                              mutationParams: untracked(() =>
                                mutationResourceParamsFnSignal()
                              ) as NonNullable<NoInfer<MutationParams>>,
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
              });
            });
          }),
        }),
      })),
      withMethods((_store) => ({
        [`mutate${capitalizedMutationName}`]: (
          mutationParams: MutationArgsParams
        ) => {
          const mutationMethod = mutationConfig.mutation.method;
          if (mutationMethod) {
            const mutationParamsResult = mutationConfig.mutation.method?.(
              _store as any
            )(mutationParams);
            mutationResourceParamsFnSignal.set(
              mutationParamsResult as MutationParams
            );
          }
        },
      }))
      //@ts-ignore
    )(store);
  }) as unknown as SignalStoreFeature<
    Input,
    MutationStoreOutput<MutationName, MutationState, MutationArgsParams>
  >;
}
