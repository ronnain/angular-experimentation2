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

type OptimisticMutationEnum<QueryState, MutationState> = {
  boolean: boolean;
  function: (data: {
    queryResource: ResourceRef<QueryState>;
    mutationResource: ResourceRef<MutationState>;
  }) => QueryState;
};

type OptimisticMutationUnion<QueryState, MutationState> =
  OptimisticMutationEnum<
    QueryState,
    MutationState
  >[keyof OptimisticMutationEnum<QueryState, MutationState>];

type OptimisticMutationQuery<
  MutationState extends object | undefined,
  QueryState
> = MutationState extends QueryState
  ? OptimisticMutationEnum<QueryState, MutationState>['boolean']
  : OptimisticMutationEnum<QueryState, MutationState>['function'];

type ReloadQueriesConfig =
  | false
  | {
      onMutationError?: boolean;
      onMutationResolved?: boolean;
      onMutationLoading?: boolean;
    };

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
    ? MutationState extends TargetedType
      ? true
      : (data: {
          queryResource: NoInfer<ResourceRef<QueryState>>;
          mutationResource: NoInfer<ResourceRef<MutationState>>;
          targetedState: TargetedType;
        }) => TargetedType
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
  reload?: ReloadQueriesConfig;
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

// ! pas ajouter de computed/selector, juste appliquer la mutation et l'exposer via un computed ?
// objectif permettre de faire des mutations optimistes, et de gérer les erreurs
// const mutation = withMutations((store) => {
//   return {
//     // todo lié un mutation à un state ? dans le cas où on veut faire de l'optimistic update ?
//     updateTodo: (id: string, todo: Todo) => resource({}), // expose une fonction dans methods
//     updateTodo2: resource({
//       params: store.updatedTodo, // signal
//       // loader ...
//     }), // n'expose pas de fonction, juste un resource (qui elle peut être peut-être déclarative)
//     update3: {
//       method?: (id: string, todo: Todo) => resource({}),
//       stateTargetedPath?: (state, params) => state.users[params.id]  // will perform an optimistic update on the state, marche pas si c'est dans un array
//       optimistic?: true,
//       optimisticResolver??: (params: !StateTargeted, stateTargeted: StateTargeted) => StateTargeted
//     },
//     update4: {
//       method?: (id: string, todo: Todo) => resource({}),
//       mutationChange: (mutationResource: ResourceMutation) => {
//         if(mutationResource.isLoading) {
//           // do something
//         }
//       },
//     }
//   };
// });
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
    const resource =
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
        [mutationName]: resource,
        ...('queries' in queryConfig && {
          [`_${mutationName}Effect`]: effect(() => {
            const resourceData = resource.hasValue()
              ? resource.value()
              : undefined;
            const resourceStatus = resource.status();

            // Handle optimistic updates on loading
            if (resourceStatus === 'loading') {
              queriesWithOptimisticMutation.forEach(
                ([queryName, queryMutationConfig]) => {
                  const queryResource = store.props[`_${queryName}Resource`];
                  if (queryMutationConfig.optimistic === true) {
                    patchState(store, (state) => {
                      return {
                        ...state,
                        [`_${queryName}State`]: queryResource.value(),
                      };
                    });
                  }
                }
              );
            }
          }),
        }),
      }))
      //@ts-ignore
    )(store);
  }) as unknown as SignalStoreFeature<
    Input,
    {
      state: { [key in MutationName]: ResourceData<MutationState> };
      props: {
        [key in `_${MutationName}Effect`]: EffectRef;
      };
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
