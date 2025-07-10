import { ResourceRef, EffectRef, effect } from '@angular/core';
import {
  patchState,
  Prettify,
  SignalStoreFeature,
  signalStoreFeature,
  SignalStoreFeatureResult,
  StateSignals,
  withProps,
  withState,
  WritableStateSource,
} from '@ngrx/signals';
import {
  ResourceData,
  ResourceStatusData,
} from './signal-store-with-server-state';
import { Merge } from '../../../util/types/merge';
import { MergeObject } from './util.type';
import { ObjectDeepPath } from './object-deep-path-mapper.type';
import {
  AccessTypeObjectPropertyByDottedPath,
  DottedPathPathToTuple,
} from './access-type-object-property-by-dotted-path.type';
import {
  createNestedStateUpdate,
  getNestedStateValue,
} from './update-state.util';

type OptimisticMutationEnum<QueryState, MutationState> = {
  boolean: boolean;
  function: (data: {
    queryResource: ResourceRef<QueryState>;
    mutationResource: ResourceRef<MutationState>;
  }) => QueryState;
};

type OptimisticMutationQuery<
  MutationState extends object | undefined,
  QueryState
> = OptimisticMutationEnum<QueryState, MutationState>['function'];

type CustomReloadOnSpecificMutationStatus<QueryState, MutationState> = (data: {
  queryResource: NoInfer<ResourceRef<QueryState>>;
  mutationResource: NoInfer<ResourceRef<MutationState>>;
}) => boolean;

// ? OptimisticMutationEnum<QueryState, MutationState>['boolean'] // can not be boolean, because MutationState does not expose a params
// : ;

type ReloadQueriesConfig<QueryState, MutationState> =
  | false
  | {
      onMutationError?:
        | boolean
        | CustomReloadOnSpecificMutationStatus<QueryState, MutationState>;
      onMutationResolved?:
        | boolean
        | CustomReloadOnSpecificMutationStatus<QueryState, MutationState>;
      onMutationLoading?:
        | boolean
        | CustomReloadOnSpecificMutationStatus<QueryState, MutationState>;
    };

type OptimisticPatchQueryFn<
  QueryState,
  MutationState extends object | undefined,
  TargetedType
> = (data: {
  queryResource: NoInfer<ResourceRef<QueryState>>;
  mutationResource: NoInfer<ResourceRef<MutationState>>;
  targetedState: TargetedType;
}) => TargetedType;

type OptimisticPathMutationQuery<
  QueryState,
  MutationState extends object | undefined
> = {
  [queryPatchPath in ObjectDeepPath<
    QueryState & {}
  >]?: AccessTypeObjectPropertyByDottedPath<
    QueryState & {},
    DottedPathPathToTuple<queryPatchPath>
  > extends infer TargetedType
    ? OptimisticPatchQueryFn<QueryState, MutationState, TargetedType>
    : never;
};

type LinkedQueryConfig<MutationState extends object | undefined, QueryState> = {
  /**
   * Will update the query state with the mutation data.
   */
  optimistic?: OptimisticMutationQuery<MutationState, QueryState>;
  /**
   * Will reload the query when the mutation is in a specific state.
   * If not provided, it will reload the query onMutationResolved and onMutationError.
   * If the query is loading, it will not reload.
   */
  reload?: ReloadQueriesConfig<QueryState, MutationState>;
  /**
   * Will patch the query specific state with the mutation data.
   * If the query is loading, it will not patch.
   * If the mutation data is not compatible with the query state, it will not patch.
   */
  optimisticPatch?: OptimisticPathMutationQuery<QueryState, MutationState>;
};

type MutationFactoryConfig<
  MutationState extends object | undefined,
  Input extends SignalStoreFeatureResult
> = MergeObject<
  {
    mutation: ResourceRef<MutationState>;
    queries: Input['props'] extends {
      __query: infer Queries;
    }
      ? {
          [key in keyof Queries]: LinkedQueryConfig<
            MutationState,
            Queries[key]
          >;
        }
      : never;
  },
  {}
>;

// todo withQuery... faire un state initial qui représente l'état et sera muté par la mutation, et préserver la réponse de la query dans un champs spécifique readonly

export function withMutation<
  Input extends SignalStoreFeatureResult,
  const MutationName extends string,
  MutationState extends object | undefined
>(
  mutationName: MutationName,
  mutationFactory: (
    store: Prettify<
      StateSignals<Input['state']> &
        Input['props'] &
        Input['methods'] & // todo remove methods ?
        WritableStateSource<Prettify<Input['state']>>
    >
  ) => ResourceRef<MutationState> | MutationFactoryConfig<MutationState, Input>
): SignalStoreFeature<
  Input,
  {
    state: {};
    props: Merge<
      {
        [key in MutationName]: ResourceData<MutationState>;
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
    methods: {};
  }
> {
  return ((store: SignalStoreFeatureResult) => {
    // todo rename to mutationConfig
    const queryConfig = mutationFactory(
      store as unknown as StateSignals<Input['state']> &
        Input['props'] &
        Input['methods'] &
        WritableStateSource<Prettify<Input['state']>>
    );
    const mutationResource =
      typeof queryConfig === 'object' && 'mutation' in queryConfig
        ? queryConfig.mutation
        : queryConfig;

    const queriesMutation =
      typeof queryConfig === 'object' && 'queries' in queryConfig
        ? queryConfig.queries
        : ({} as Record<string, LinkedQueryConfig<MutationState, any>>);
    const queriesWithOptimisticMutation = Object.entries(
      queriesMutation
    ).filter(([, queryMutationConfig]) => queryMutationConfig.optimistic);
    const queriesWithOptimisticPatch = Object.entries(queriesMutation).filter(
      ([, queryMutationConfig]) => queryMutationConfig.optimisticPatch
    );
    const queriesWithReload = Object.entries(queriesMutation).filter(
      ([, queryMutationConfig]) => queryMutationConfig.reload
    );

    return signalStoreFeature(
      withProps((store) => ({
        [mutationName]: mutationResource,
        ...('queries' in queryConfig && {
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
                        if (reloadConfig({ queryResource, mutationResource })) {
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
                        if (reloadConfig({ queryResource, mutationResource })) {
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
                        if (reloadConfig({ queryResource, mutationResource })) {
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
      }))
      //@ts-ignore
    )(store);
  }) as unknown as SignalStoreFeature<
    Input,
    {
      state: {};
      props: Merge<
        {
          [key in MutationName]: ResourceData<MutationState>;
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
      methods: {};
    }
  >;
}

function WrapperTest<
  const Config extends {
    key: string;
  }
>(config: Config) {
  return (data: {
    [key in Config['key']]: true;
  }) => {
    return {
      ...data,
      [config.key]: true,
    };
  };
}
WrapperTest({
  key: 'test3',
})({
  test3: true,
});
