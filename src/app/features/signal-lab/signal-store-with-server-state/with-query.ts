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

export function withQuery<
  Input extends SignalStoreFeatureResult,
  const ResourceName extends string,
  State extends object | undefined
>(
  resourceName: ResourceName,
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
    state: { [key in ResourceName]: ResourceData<State> };
    props: {
      [key in `_${ResourceName}Effect`]: EffectRef;
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
      state: { [key in ResourceName]: ResourceData<State> };
      props: {
        [key in `_${ResourceName}Effect`]: EffectRef;
      };
      methods: {};
    }
  >;
}
