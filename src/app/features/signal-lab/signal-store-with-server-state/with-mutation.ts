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

// ! pas ajouter de computed/selector, juste appliquer la mutation et l'exposer via un computed ?
// objectif permettre de faire des mutations optimistes, et de gérer les erreurs
const mutation = withMutations((store) => {
  return {
    // todo lié un mutation à un state ? dans le cas où on veut faire de l'optimistic update ?
    updateTodo: (id: string, todo: Todo) => resource({}), // expose une fonction dans methods
    updateTodo2: resource({
      params: store.updatedTodo, // signal
      // loader ...
    }), // n'expose pas de fonction, juste un resource (qui elle peut être peut-être déclarative)
    update3: {
      method?: (id: string, todo: Todo) => resource({}),
      stateTargetedPath?: (state, params) => state.users[params.id]  // will perform an optimistic update on the state, marche pas si c'est dans un array
      optimistic?: true,
      optimisticResolver??: (params: !StateTargeted, stateTargeted: StateTargeted) => StateTargeted
    },
    update4: {
      method?: (id: string, todo: Todo) => resource({}),
      mutationChange: (mutationResource: ResourceMutation) => {
        if(mutationResource.isLoading) {
          // do something
        }
      },
    }
  };
});
export function withMutation<
  Input extends SignalStoreFeatureResult,
  const MutationName extends string,
  State extends object | undefined
>(
  resourceName: MutationName,
  queryFactory: (
    store: Prettify<
      StateSignals<Input['state']> &
        Input['props'] &
        Input['methods'] & // todo remove methods ?
        WritableStateSource<Prettify<Input['state']>>
    >
  ) => ResourceRef<State>
): SignalStoreFeature<
  Input,
  {
    state: { [key in MutationName]: ResourceData<State> };
    props: {
      [key in `_${MutationName}Effect`]: EffectRef;
    };
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
          value: resource.value() as State | undefined,
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
                : (state[resourceName].value as State),
              status: {
                isLoading: resource.isLoading(),
                isLoaded: resource.status() === 'resolved',
                hasError: resource.status() === 'error',
                status: resource.status(),
                error: resource.error(),
              },
            } satisfies ResourceData<State>,
          }));
        }),
      }))
      //@ts-ignore
    )(store);
  }) as unknown as SignalStoreFeature<
    Input,
    {
      state: { [key in MutationName]: ResourceData<State> };
      props: {
        [key in `_${MutationName}Effect`]: EffectRef;
      };
      methods: {};
    }
  >;
}
