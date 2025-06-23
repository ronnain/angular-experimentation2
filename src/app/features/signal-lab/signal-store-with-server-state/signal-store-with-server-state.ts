// faire en sorte d'avoir stated users
// pouvoir définir des asyncAction
// exporter les events des async actions
// faire d'abord la logique pour entities

import {
  effect,
  EffectRef,
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
  isLoaded: boolean;
  hasError: boolean;
  error: Error | undefined;
};

type ResourceData<State extends object | undefined> = {
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
    initialResourceState: {
      id: '1',
      name: 'John Doe',
      email: '',
    },
    resourceName: 'users',
  })),
  withHooks((store) => ({
    onInit: () => {
      const test = store.users;
      const effect = store._usersEffect;

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

const queryTest = withQuery((store) => ({
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
  initialResourceState: {
    id: '1',
    name: 'John Doe',
    email: '',
  },
  resourceName: 'users',
}));

function withQuery<
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
  return ((store: unknown) => {
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
                : state[resourceName].value,
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
