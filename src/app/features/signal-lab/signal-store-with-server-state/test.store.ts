import {
  signalStore,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { withQuery } from './with-query';
import { rxResource } from '@angular/core/rxjs-interop';
import { BehaviorSubject, delay, lastValueFrom, of } from 'rxjs';
import { withMutation } from './with-mutation';
import { signal } from '@angular/core';

type User = {
  id: string;
  name: string;
  email: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
};
type Category = {
  id: string;
  name: string;
};

export const testStore = signalStore(
  {
    providedIn: 'root',
  },
  withState({
    pagination: {
      page: 1,
      pageSize: 10,
    },
    selectedUserId: '5' as string | undefined,
    userDetails: {
      stateToPreserve: {
        test: true,
      },
      user: undefined as User | undefined,
      bff: {
        products: [] as Product[],
        categories: [] as Category[],
      },
    },
  }),
  //! Ce qui n'est pas ouf, c'est que ça propose les méthodes de `resource` et pas de `rxResource`
  withQuery('userQueryWithAssociatedClientState', (store) => ({
    resource: rxResource({
      params: store.selectedUserId,
      stream: ({ params }) => {
        console.log('params', params);
        const result = new BehaviorSubject<User | undefined>(undefined);

        // setTimeout(() => {
        //   result.next({
        //     id: '1',
        //     name: 'John Doe',
        //     email: 'a@a.fr',
        //   });
        // }, 3000);
        // setTimeout(() => {
        //   result.next({
        //     id: '2',
        //     name: 'John Doe2',
        //     email: 'a@a.fr',
        //   });
        // }, 6000);
        return of({
          id: '1',
          name: 'John Doe',
          email: 'a@a.fr',
        }).pipe(delay(2000));
      },
    }),
    clientStatePath: 'userDetails.user',
  })),
  withQuery('bffQueryProductsAndCategories', (store) => ({
    resource: rxResource({
      params: store.selectedUserId,
      stream: ({ params }) => {
        console.log('params', params);
        const result = new BehaviorSubject<User | undefined>(undefined);
        return of({
          products: [
            {
              id: '1',
              name: 'Product 1',
              price: 100,
            },
          ] satisfies Product[],
          categories: [
            {
              id: '1',
              name: 'Category 1',
            },
          ] satisfies Category[],
        }).pipe(delay(2000));
      },
    }),
    clientStatePath: 'userDetails.bff',
    // todo migrer withQuery comme pour withMuatation
    mapResourceToState: ({ resource }) => ({
      products: resource.value()?.products,
      categories: resource.value()?.categories,
    }),
  })),
  withProps(() => ({
    _updateUserSrc: signal<User | undefined>(undefined),
  })),
  withMutation('updateUserName', {
    mutation: {
      method: (store) => (userName: string) => {
        const user = store.userDetails().user;
        return {
          ...store.userDetails().user,
          name: userName,
        };
      },
      loader: ({ params }) => {
        console.log('params', params);
        return lastValueFrom(of(params).pipe(delay(2000)));
      },
    },
    queries: {
      userQueryWithAssociatedClientState: {
        optimistic: ({ mutationParams, queryResource }) => {
          debugger;
          const queryValue = queryResource.value();
          if (!queryValue) {
            throw new Error('Query resource is not available');
          }
          return {
            ...queryValue,
            ...mutationParams,
          };
        },
      },
    },
  })
);

// todo checker pourquoi il n'y a pas de value quand ça charge
