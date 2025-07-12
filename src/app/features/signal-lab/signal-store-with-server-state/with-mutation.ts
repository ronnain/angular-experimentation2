import {
  ResourceLoader,
  ResourceOptions,
  ResourceRef,
  effect,
  resource,
  signal,
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

type MutationFactoryConfig<
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

export function mutation<
  Input extends SignalStoreFeatureResult,
  const MutationName extends string,
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
) {
  return mutationResourceConfig;
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
  methods: {
    [key in MutationName as `trigger${Capitalize<key>}`]: (
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
      // No idea why this is needed, but without that the MutationState can not be passed as input, in query optimistic functions
      tsTypeHelper?: (test: NoInfer<MutationState>) => void;
    },
    MutationFactoryConfig<
      Input,
      MutationState,
      MutationParams,
      MutationArgsParams
    >
  >
): SignalStoreFeature<
  Input,
  MutationStoreOutput<MutationName, MutationState, MutationArgsParams>
> {
  return ((store: SignalStoreFeatureResult) => {
    // todo rename to mutationConfig

    const mutationResourceOption =
      typeof mutationConfig === 'object' && 'mutation' in mutationConfig
        ? mutationConfig.mutation
        : mutationConfig;

    // resourceParamsFnSignal will be used has params signal to trigger the mutation loader
    // todo method
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
            const resourceData = mutationResource.hasValue()
              ? mutationResource.value()
              : undefined;
            const mutationStatus = mutationResource.status();

            // Handle optimistic updates on loading
            if (mutationStatus === 'loading') {
              queriesWithOptimisticMutation.forEach(
                ([queryName, queryMutationConfig]) => {
                  const queryResource = (store as any)[
                    `_${queryName}Resource`
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
            // Handle optimistic patch
            if (mutationStatus === 'loading') {
              queriesWithOptimisticPatch.forEach(
                ([queryName, queryMutationConfig]) => {
                  const queryResource = (store as any)[
                    `_${queryName}Resource`
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
                    const optimisticValue = optimisticPatch({
                      mutationResource,
                      queryResource,
                      targetedState: getNestedStateValue({
                        state: queryResource.hasValue()
                          ? queryResource.value()
                          : undefined,
                        keysPath: path.split('.'),
                      }),
                    });

                    if (!queryResource.isLoading()) {
                      queryResource.set(
                        createNestedStateUpdate({
                          state: queryResource.hasValue()
                            ? queryResource.value()
                            : undefined,
                          keysPath: path.split('.'),
                          value: optimisticValue,
                        })
                      );
                    }
                  });
                }
              );
            }
            // Handle reload queries
            queriesWithReload.forEach(([queryName, queryMutationConfig]) => {
              const queryResource = (store as any)[
                `_${queryName}Resource`
              ] as ResourceRef<any>;

              if (queryMutationConfig.reload) {
                Object.entries(queryMutationConfig.reload).forEach(
                  ([reloadType, reloadConfig]) => {
                    if (
                      reloadType === 'onMutationError' &&
                      mutationStatus === 'error'
                    ) {
                      if (typeof reloadConfig === 'function') {
                        if (
                          reloadConfig({
                            queryResource,
                            mutationResource,
                            mutationParams:
                              mutationResourceParamsFnSignal() as NonNullable<
                                NoInfer<MutationParams>
                              >,
                          })
                        ) {
                          queryResource.reload();
                        }
                      } else if (reloadConfig) {
                        queryResource.reload();
                      }
                    }
                    if (
                      reloadType === 'onMutationResolved' &&
                      mutationStatus === 'resolved'
                    ) {
                      if (typeof reloadConfig === 'function') {
                        if (
                          reloadConfig({
                            queryResource,
                            mutationResource,
                            mutationParams:
                              mutationResourceParamsFnSignal() as NonNullable<
                                NoInfer<MutationParams>
                              >,
                          })
                        ) {
                          queryResource.reload();
                        }
                      } else if (reloadConfig) {
                        queryResource.reload();
                      }
                    }
                    if (
                      reloadType === 'onMutationLoading' &&
                      mutationStatus === 'loading'
                    ) {
                      if (typeof reloadConfig === 'function') {
                        if (
                          reloadConfig({
                            queryResource,
                            mutationResource,
                            mutationParams:
                              mutationResourceParamsFnSignal() as NonNullable<
                                NoInfer<MutationParams>
                              >,
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
          }),
        }),
      })),
      withMethods(() => ({
        [`trigger${capitalizedMutationName}`]: (
          mutationParams: MutationArgsParams
        ) => {
          const mutationMethod = mutationConfig.mutation.method;
          if (mutationMethod) {
            const mutationParamsResult = mutationConfig.mutation.method?.(
              store as any
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
