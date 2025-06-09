// faire en sorte d'avoir stated users
// pouvoir définir des asyncAction
// exporter les events des async actions
// faire d'abord la logique pour entities

import {
  effect,
  inject,
  resource,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import {
  patchState,
  Prettify,
  signalStore,
  signalStoreFeature,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { Action, fromResource } from './resource-store';

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
  // todo pass the store in parameters ?
  withGranularEntitiesV2(
    {
      // todo rename fromResource ? fromResource(resource | ({events}) => resource, reducer) ?, optional reducer si retourne un array du même type ?
      getAll: fromResource(
        () =>
          resource({
            params: () => 5,
            loader: ({ params }) => {
              // return a promise with 10
              return new Promise<UserTest[]>((resolve) => {
                setTimeout(() => {
                  resolve(
                    Array.from({ length: params }, (_, i) => ({
                      id: `user-${i + 1}`,
                      name: `User ${i + 1}`,
                      email: `user${i + 1}` + '@example.com',
                    }))
                  );
                }, 1000);
              });
            },
          }),
        // todo only if different type
        ({ actionResource, state }) => ({
          // do not forget to handle the error case
          ...state,
          status: { ...state.status, GET: actionResource.status() },
          users:
            (actionResource.hasValue()
              ? actionResource.value()
              : state.users) ?? [],
        })
      ),
    },
    {
      initialState: {
        entities: [] as UserTest[],
      },
    }
  )
);

const testImpl = inject(storeTest);
testImpl.entities()[0].uiStatus?.getAll.isLoading;
// testImpl.entitiesActionsEvents.getAll.subscribe((event) => console.log(event));

function withGranularEntitiesV2<
  Entity extends object,
  ActionKeys extends keyof Actions,
  Actions extends Record<
    ActionKeys,
    Action<
      any,
      {
        stateType: {
          entities: Entity[];
          // actionStatus
        };
        actions: ActionKeys & string; // todo check if it is ok
      },
      any
    >
  >
>(actions: Actions, options: { initialState: { entities: Entity[] } }) {
  const innerStore = withGranularEntitiesInnerStore<{
    stateType: {
      entities: ToGranularEntity<Entity, ActionKeys>[];
    };
    actions: ActionKeys & string;
  }>()(actions, {
    initialState: options.initialState,
  });

  return signalStoreFeature(
    withState<{ entities: Prettify<ToGranularEntity<Entity, ActionKeys>>[] }>({
      entities: innerStore.state().entities,
    }),
    withProps(() => ({
      entitiesSignalEvents: innerStore.signalEvents,
    })),
    withMethods((store) => {
      effect(() => {
        patchState(store, () => ({
          entities: innerStore.state().entities,
        }));
      });
      return {};
    })
  );
}
