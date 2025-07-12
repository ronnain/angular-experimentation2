import {
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

type NoInferDeep<T> = [T][T extends any ? 0 : never];

export type MutationScope = any extends {
  state: any;
  params: any;
  methodArgs: any;
}
  ? {
      state: object | undefined;
      params: unknown | undefined;
      methodArgs: unknown;
    }
  : never;
export type MutationCoreType<T extends MutationScope> = T;

type OptimisticMutationQuery<
  QueryState,
  MutationCore extends MutationScope
> = (data: {
  queryResource: ResourceRef<QueryState>;
  mutationResource: ResourceRef<MutationCore['state']>;
  mutationParams: MutationCore['params'] | undefined;
}) => QueryState;

type CustomReloadOnSpecificMutationStatus<
  QueryState,
  MutationCore extends MutationScope
> = (data: {
  queryResource: NoInfer<ResourceRef<QueryState>>;
  mutationResource: NoInfer<ResourceRef<MutationCore['state']>>;
  mutationParams: NoInfer<MutationCore['params'] | undefined>;
}) => boolean;

// ? OptimisticMutationEnum<QueryState, MutationState>['boolean'] // can not be boolean, because MutationState does not expose a params
// : ;

type ReloadQueriesConfig<QueryState, MutationCore extends MutationScope> =
  | false
  | {
      onMutationError?:
        | boolean
        | CustomReloadOnSpecificMutationStatus<QueryState, MutationCore>;
      onMutationResolved?:
        | boolean
        | CustomReloadOnSpecificMutationStatus<QueryState, MutationCore>;
      onMutationLoading?:
        | boolean
        | CustomReloadOnSpecificMutationStatus<QueryState, MutationCore>;
    };

type OptimisticPatchQueryFn<
  QueryState,
  MutationCore extends MutationScope,
  TargetedType
> = (data: {
  queryResource: NoInfer<ResourceRef<QueryState>>;
  mutationResource: NoInfer<ResourceRef<MutationCore['state']>>;
  targetedState: TargetedType;
}) => TargetedType;

type OptimisticPathMutationQuery<
  QueryState,
  MutationCore extends MutationScope
> = {
  [queryPatchPath in ObjectDeepPath<
    QueryState & {}
  >]?: AccessTypeObjectPropertyByDottedPath<
    QueryState & {},
    DottedPathPathToTuple<queryPatchPath>
  > extends infer TargetedType
    ? OptimisticPatchQueryFn<QueryState, MutationCore, TargetedType>
    : never;
};

type LinkedQueryConfig<MutationCore extends MutationScope, QueryState> = {
  /**
   * Will update the query state with the mutation data.
   */
  optimistic?: OptimisticMutationQuery<QueryState, MutationCore>;
  /**
   * Will reload the query when the mutation is in a specific state.
   * If not provided, it will reload the query onMutationResolved and onMutationError.
   * If the query is loading, it will not reload.
   */
  reload?: ReloadQueriesConfig<QueryState, MutationCore>;
  /**
   * Will patch the query specific state with the mutation data.
   * If the query is loading, it will not patch.
   * If the mutation data is not compatible with the query state, it will not patch.
   */
  optimisticPatch?: OptimisticPathMutationQuery<QueryState, MutationCore>;
};

type MutationFactoryConfig<
  Input extends SignalStoreFeatureResult,
  MutationCore extends MutationScope
> = {
  queries?: Input['props'] extends {
    __query: infer Queries;
  }
    ? {
        [key in keyof Queries]: LinkedQueryConfig<MutationCore, Queries[key]>;
      }
    : never;
};

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

// todo withQuery... faire un state initial qui représente l'état et sera muté par la mutation, et préserver la réponse de la query dans un champs spécifique readonly

export function withMutation<
  Input extends SignalStoreFeatureResult,
  const MutationName extends string,
  MutationState extends object | undefined,
  MutationParams,
  MutationArgsParams,
  Test,
  MutationCore extends MutationScope extends {
    state: MutationState;
    params: MutationParams;
    args: MutationArgsParams;
  }
    ? {
        state: MutationState;
        params: MutationParams;
        args: MutationArgsParams;
      }
    : never
>(
  mutationName: MutationName,
  mutationFactory: (
    store: Prettify<
      StateSignals<Input['state']> &
        Input['props'] &
        Input['methods'] & // todo remove methods ?
        WritableStateSource<Prettify<Input['state']>>
    >
  ) => MergeObject<
    {
      test: Test;
      testInfer: NoInfer<Test>;
      testMutation: {
        testInfer: NoInfer<Test>;
      };
      testMutationFn: {
        testInfer: (
          store: Prettify<
            StateSignals<Input['state']> &
              Merge<
                Input['props'],
                {
                  test: NoInferDeep<NoInfer<Test>>;
                }
              > &
              Input['methods'] & // todo remove methods ?
              WritableStateSource<Prettify<Input['state']>>
          >
        ) => void;
      };
      // resource: ResourceOptions<MutationState, NoInfer<Test>>;
      // mutation: ResourceWithParamsOrParamsFn<
      //   MutationState,
      //   MutationParams,
      //   MutationArgsParams
      // >;
      // loader: (param: { params: NoInfer<Test> }) => Promise<MutationState>;
    },
    MutationFactoryConfig<Input, MutationCore>
  >
): SignalStoreFeature<
  Input,
  MutationStoreOutput<MutationName, MutationState, MutationArgsParams>
> {
  return ((store: SignalStoreFeatureResult) => {
    // todo rename to mutationConfig
    const mutationConfig = mutationFactory(
      store as unknown as StateSignals<Input['state']> &
        Input['props'] &
        Input['methods'] &
        WritableStateSource<Prettify<Input['state']>>
    );
    const mutationResourceOption =
      typeof mutationConfig === 'object' && 'mutation' in mutationConfig
        ? mutationConfig.mutation
        : mutationConfig;

    // resourceParamsFnSignal will be used has params signal to trigger the mutation loader
    const mutationResourceParamsFnSignal = signal<
      MutationCore['params'] | undefined
    >(undefined);
    const resourceParamsSrc =
      mutationResourceOption.params ?? mutationResourceParamsFnSignal;

    const mutationResource = resource<
      MutationCore['state'],
      MutationCore['params']
    >({
      ...mutationResourceOption,
      params: resourceParamsSrc,
    } as any);

    const queriesMutation =
      typeof mutationConfig === 'object' && 'queries' in mutationConfig
        ? mutationConfig.queries
        : ({} as Record<string, LinkedQueryConfig<MutationCore, any>>);
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
                    mutationParams: resourceParamsSrc() as
                      | MutationCore['params']
                      | undefined,
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
                      OptimisticPatchQueryFn<any, any, any>
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
                            mutationParams: mutationResourceParamsFnSignal(),
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
                            mutationParams: mutationResourceParamsFnSignal(),
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
                            mutationParams: mutationResourceParamsFnSignal(),
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
          mutationParams: MutationCore['methodArgs']
        ) => {
          mutationResourceParamsFnSignal.set(mutationParams);
        },
      }))
      //@ts-ignore
    )(store);
  }) as unknown as SignalStoreFeature<
    Input,
    MutationStoreOutput<MutationName, MutationState, MutationArgsParams>
  >;
}
