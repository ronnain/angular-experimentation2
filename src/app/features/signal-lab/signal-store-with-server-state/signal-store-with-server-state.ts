// faire en sorte d'avoir stated users
// pouvoir définir des asyncAction
// exporter les events des async actions
// faire d'abord la logique pour entities

import {
  effect,
  inject,
  resource,
  ResourceRef,
  ResourceStatus,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import {
  EmptyFeatureResult,
  patchState,
  Prettify,
  signalStore,
  SignalStoreFeature,
  signalStoreFeature,
  SignalStoreFeatureResult,
  StateSignals,
  withMethods,
  withProps,
  withState,
  WritableStateSource,
} from '@ngrx/signals';
import { of } from 'rxjs';

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
  error: Error | undefined;
};

type ResourceData<State extends object> = {
  value: State | undefined;
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

type UserTest = {
  id: string;
  name: string;
  email: string;
};

const storeTest = signalStore(
  withState({
    pagination: {
      page: 1,
      pageSize: 10,
    },
  }),
  withQuery((storeData) => {
    storeData.test;
    return {
      resourceName: 'users',
      resource: resource<UserTest>({
        params: storeData.stateSignals.pagination(),
        loader: (pagination) => {
          return of<UserTest>({
            id: '1',
            name: 'John Doe',
            email: 'john.doe@a.com',
          });
        },
      }),
    };
  })
);

const testImpl = inject(storeTest);
// testImpl.entities()[0].uiStatus?.getAll.isLoading;
// testImpl.entitiesActionsEvents.getAll.subscribe((event) => console.log(event));

function withQuery<
  State extends object,
  ResourceName extends string,
  StateI,
  Input extends {
    state: StateI;
    props: object;
    methods: Methods;
  },
  Incoming extends Prettify<
    StateSignals<Input['state']> &
      Input['props'] &
      Input['methods'] &
      WritableStateSource<Prettify<Input['state']>>
  >,
  Methods extends Record<string, Function>
>(
  fn: (store: Incoming) => {
    resourceName: ResourceName;
    resource: ResourceRef<State>;
    initialValue: NoInfer<State> | undefined;
  }
) {
  return (store: T) => {
    const { resourceName, resource, initialValue } = fn(store);
    const initialResourceState: ResourceData<State> = {
      value: initialValue,
      status: {
        status: 'local',
        isLoading: false,
        error: undefined,
      },
    };
  };

  // return signalStoreFeature(
  //   withState({[resourceName]: initialResourceState}),
  //   withProps((store) => ({
  //     [`_${resourceName}Effect`]: effect(() => {
  //         patchState(store, (state) => ({
  //           [resourceName]: {
  //             value: resource.hasValue() ? resource.value() : state[resourceName].value,
  //             status: {
  //               isLoading: resource.isLoading(),
  //               status: resource.status(),
  //               error: resource.error(),
  //             },
  //           } satisfies ResourceData<State>,
  //         }));
  //     }),
  //   })))
}
