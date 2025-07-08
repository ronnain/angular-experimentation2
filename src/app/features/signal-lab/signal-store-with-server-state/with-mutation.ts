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
  queryFactory: (
    store: Prettify<
      StateSignals<Input['state']> &
        Input['props'] &
        Input['methods'] & // todo remove methods ?
        WritableStateSource<Prettify<Input['state']>>
    >
  ) =>
    | ResourceRef<MutationState>
    | MergeObject<
        {
          mutation: ResourceRef<MutationState>;
          queries: Input['props'] extends { __query: infer Q }
            ? {
                [key in keyof Q]: {
                  /**
                   * Will update the query state with the mutation data.
                   */
                  optimistic?: MutationState extends Q[key]
                    ? boolean
                    : (data: {
                        queryResource: ResourceRef<Q[key]>;
                        mutationResource: ResourceRef<MutationState>;
                      }) => Q[key];
                  /**
                   * Will reload the query when the mutation is in a specific state.
                   * If the query is loading, it will not reload.
                   */
                  reload?:
                    | false
                    | {
                        onMutationError?: boolean;
                        onMutationResolved?: boolean;
                        onMutationLoading?: boolean;
                        onMutationIdle?: boolean;
                      };
                  /**
                   * Will patch the query specific state with the mutation data.
                   * If the query is loading, it will not patch.
                   * If the mutation data is not compatible with the query state, it will not patch.
                   */
                  optimisticPatch?: {
                    [queryPatchPath in ObjectDeepPath<
                      Q[key] & {}
                    >]?: AccessTypeObjectPropertyByDottedPath<
                      Q[key] & {},
                      DottedPathPathToTuple<queryPatchPath>
                    > extends infer TargetedType
                      ? MutationState extends TargetedType
                        ? true
                        : (data: {
                            queryResource: NoInfer<ResourceRef<Q[key]>>;
                            mutationResource: NoInfer<
                              ResourceRef<MutationState>
                            >;
                            targetedState: TargetedType;
                          }) => TargetedType
                      : never;
                  };
                };
              }
            : never;
        },
        {}
      >
): SignalStoreFeature<
  Input,
  {
    state: {};
    props: Merge<
      {
        [key in MutationName]: ResourceData<MutationState>;
      },
      {
        __mutation: {
          [key in MutationName]: MutationState;
        };
      }
    >;
    methods: {};
  }
> {
  return ((store: SignalStoreFeatureResult) => {
    const resource = queryFactory(
      store as unknown as StateSignals<Input['state']> &
        Input['props'] &
        Input['methods'] & // todo remove methods ?
        WritableStateSource<Prettify<Input['state']>>
    );

    return signalStoreFeature(
      withState({
        [resourceName]: {
          value: resource.value() as MutationState | undefined,
          status: {
            isLoading: false,
            isLoaded: false,
            hasError: false,
            status: 'idle',
            error: undefined,
          } satisfies ResourceStatusData as ResourceStatusData,
        },
      }),
      withProps((store) => ({
        [`_${resourceName}Effect`]: effect(() => {
          patchState(store, (state) => ({
            [resourceName]: {
              value: resource.hasValue()
                ? resource.value()
                : (state[resourceName].value as MutationState),
              status: {
                isLoading: resource.isLoading(),
                isLoaded: resource.status() === 'resolved',
                hasError: resource.status() === 'error',
                status: resource.status(),
                error: resource.error(),
              },
            } satisfies ResourceData<MutationState>,
          }));
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
