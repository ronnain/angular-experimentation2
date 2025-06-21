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
  withHooks,
  withMethods,
  withProps,
  withState,
  WritableStateSource,
} from '@ngrx/signals';
import { from, lastValueFrom, of } from 'rxjs';
import {
  assertUniqueStoreMembers,
  InnerSignalStore,
  SignalsDictionary,
  STATE_SOURCE,
} from './inner-signal-store';
import { rxResource } from '@angular/core/rxjs-interop';

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

const r = rxResource({
  params: () => ({
    page: 1,
    pageSize: 10,
  }),
  stream: ({ params }) => {
    return of<UserTest>({
      id: '1',
      name: 'John Doe',
      email: 'john.doe@a.com',
    });
  },
});

const storeTest = signalStore(
  withState({
    pagination: {
      page: 1,
      pageSize: 10,
    },
  }),
  withQuery((store) => ({
    //         ^?
    resource: rxResource({
      params: store.pagination,
      stream: ({ params }) => {
        return of<UserTest>({
          id: '1',
          name: 'John Doe',
          email: 'john.doe@a.com',
        });
      },
    }),
    resourceName: 'users',
  })),
  withHooks((store) => ({
    onInit: () => {
      const test = store.users;

      console.log('Store initialized', store);
    },
    onDestroy: () => {
      console.log('Store destroyed');
    },
  }))
);

const testImpl = inject(storeTest);
// testImpl.entities()[0].uiStatus?.getAll.isLoading;
// testImpl.entitiesActionsEvents.getAll.subscribe((event) => console.log(event));

const queryTest = withQuery(() => ({
  //         ^?
  resource: resource({
    loader: () => {
      return lastValueFrom(
        of<UserTest>({
          id: '1',
          name: 'John Doe',
          email: 'john.doe@a.com',
        })
      );
    },
  }),
  resourceName: 'users',
}));

function withQuery<
  Input extends SignalStoreFeatureResult,
  const ResourceName extends string,
  State
>(
  methodsFactory: (
    store: Prettify<
      StateSignals<Input['state']> &
        Input['props'] &
        Input['methods'] & // todo remove methods ?
        WritableStateSource<Prettify<Input['state']>>
    >
  ) => {
    resourceName: ResourceName;
    resource: ResourceRef<State>;
  }
): SignalStoreFeature<
  Input,
  { state: { [key: ResourceName]: { test: true } }; props: {}; methods: {} }
> {
  // ): SignalStoreFeature<Input, { state: {[key: ResourceName]: State}; props: {}; methods: {} }> {
  return (store) => {
    // const methods = methodsFactory({
    //   [STATE_SOURCE]: store[STATE_SOURCE],
    //   ...store.stateSignals,
    //   ...store.props,
    //   ...store.methods,
    // });
    // assertUniqueStoreMembers(store, Reflect.ownKeys(methods));

    return {
      ...store,
      // methods: { ...store.methods, ...methods },
    } as unknown as InnerSignalStore<{ [key: ResourceName]: { test: true } }>;
  };
}

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

function withQuery2<
  Input extends SignalStoreFeatureResult,
  const ResourceName extends string,
  State
>(
  methodsFactory: (
    store: Prettify<
      StateSignals<Input['state']> &
        Input['props'] &
        Input['methods'] & // todo remove methods ?
        WritableStateSource<Prettify<Input['state']>>
    >
  ) => {
    resourceName: ResourceName;
    resource: ResourceRef<State>;
  }
): SignalStoreFeature<
  Input,
  { state: { [key in ResourceName]: { test: true } }; props: {}; methods: {} }
> {
  return ((store) => {
    const { resource, resourceName } = methodsFactory(
      store as unknown as StateSignals<Input['state']> &
        Input['props'] &
        Input['methods'] & // todo remove methods ?
        WritableStateSource<Prettify<Input['state']>>
    );
    return signalStoreFeature(
      withState({
        [resourceName]: {
          value: undefined as State | undefined,
          status: {
            isLoading: false,
            status: 'idle',
            error: undefined,
          } satisfies ResourceStatusData,
        },
      })
    );
  }) as ;

  // ): SignalStoreFeature<Input, { state: {[key: ResourceName]: State}; props: {}; methods: {} }> {
}
