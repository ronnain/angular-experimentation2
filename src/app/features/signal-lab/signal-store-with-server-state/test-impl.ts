import { rxResource } from '@angular/core/rxjs-interop';
import { signalStore, withState, withHooks } from '@ngrx/signals';
import { of, lastValueFrom } from 'rxjs';
import { resourceById } from '../resource-by-id';
import { withQuery } from './signal-store-with-server-state';
import { resource } from '@angular/core';
import { withQueryById } from './with-query-by-id';

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
    selectedUserId: undefined as string | undefined,
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
  withQueryById('usersById', (store) =>
    resourceById({
      params: store.selectedUserId,
      loader: (params) => {
        return lastValueFrom(
          of({
            id: '1',
            name: 'John Doe',
            email: 'test@a.com',
          })
        );
      },
      identifier: (params) => params,
    })
  ),
  withHooks((store) => ({
    onInit: () => {
      const test = store.users;
      const test2 = store.usersById()['1']?.value;
      //    ^?
      const effect = store._usersEffect;

      console.log('Store initialized', store);
    },
    onDestroy: () => {
      console.log('Store destroyed');
    },
  }))
);

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
