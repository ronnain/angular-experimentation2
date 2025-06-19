// faire en sorte d'avoir stated users
// pouvoir définir des asyncAction
// exporter les events des async actions
// faire d'abord la logique pour entities

import {
  effect,
  inject,
  resource,
  ResourceRef,
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
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { of } from 'rxjs';

type Merge<T, U> = T & U;

// todo improve this type
type StatedAction = {
  isLoading: boolean;
  isLoaded: boolean;
  error?: string;
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
  // todo pass the store in parameters ?
  withQuery(
    (store) => ({
    resourceName: 'users',
    resource<UserTest>({
      params: store.state.pagination(),
      loader: (pagination) => {
        return of<UserTest>({
          id: '1',
          name: 'John Doe',
          email: 'john.doe@a.com',
        });
      },
    })})
  )
);

const testImpl = inject(storeTest);
testImpl.entities()[0].uiStatus?.getAll.isLoading;
// testImpl.entitiesActionsEvents.getAll.subscribe((event) => console.log(event));

function withQuery<
  State extends object,
  ResourceName extends string,
  >(
  {resource,resourceName,initialValue}: {
    resourceName: ResourceName;
    resource: ResourceRef<State>;
    initialValue: NoInfer<State>;
  }) {
    const innerQuery = signalStoreFeature(
      withState({[resourceName]: {
        value: initialValue,
        status: {
          isLoading: false,
          isLoaded: false,
          hasError: false,
          error: null,
        }
      }}),
      withProps((store) => ({
        [`__set_${resourceName}Effect`]: effect(() => {
          // TODO Gérer tous les cas, erreur/ idle.../laoding
          if(resource.hasValue()) {
            patchState(store, (state) => ({
              [resourceName]: {
                value: resource.value(),
                status: {
                  isLoading: false,
                  isLoaded: true,
                  hasError: false,
                  error: null,
                },
              },
            }));
          }
        }),
      })))

    return

  }
