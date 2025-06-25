// faire en sorte d'avoir stated users
// pouvoir définir des asyncAction
// exporter les events des async actions
// faire d'abord la logique pour entities

import { effect, EffectRef, ResourceRef, ResourceStatus } from '@angular/core';
import {
  EmptyFeatureResult,
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
import { InnerSignalStore } from './inner-signal-store';
import { ResourceByIdRef } from './resource-by-id-signal-store';

type Merge<T, U> = T & U;

// todo improve this type
type StatedAction = {
  isLoading: boolean;
  isLoaded: boolean;
  error?: string;
};

type ResourceStatusData = {
  status: ResourceStatus;
  isLoading: boolean;
  isLoaded: boolean;
  hasError: boolean;
  error: Error | undefined;
};

export type ResourceData<State extends object | undefined> = {
  value: State;
  status: ResourceStatusData;
};

type ToGranularEntity<
  Entity extends object,
  ActionKeys extends string | number | symbol
> = Merge<
  Entity,
  {
    uiStatus?: Prettify<Record<ActionKeys, StatedAction>>;
  }
>;

// todo create globalAction, and granularAction ?
// optimistic update and minium loading time ?

export function withQuery<
  Input extends SignalStoreFeatureResult,
  const ResourceName extends string,
  State extends object | undefined
>(
  queryFactory: (
    store: Prettify<
      StateSignals<Input['state']> &
        Input['props'] &
        Input['methods'] & // todo remove methods ?
        WritableStateSource<Prettify<Input['state']>>
    >
  ) => {
    resourceName: ResourceName;
    resource: ResourceRef<State>;
    initialResourceState: NoInfer<State>; // todo remove (can be retrieved from resource)
  }
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
    const { resource, resourceName, initialResourceState } = queryFactory(
      store as unknown as StateSignals<Input['state']> &
        Input['props'] &
        Input['methods'] & // todo remove methods ?
        WritableStateSource<Prettify<Input['state']>>
    );

    return signalStoreFeature(
      store,
      withState({
        [resourceName]: {
          value: initialResourceState as State | undefined,
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
    );
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
