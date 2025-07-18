import { signalStore, withProps, withState } from '@ngrx/signals';
import { clientState, query, withQuery } from './with-query';
import { BehaviorSubject, delay, lastValueFrom, of } from 'rxjs';
import { resource, signal } from '@angular/core';
import { mutation, withMutation } from './with-mutation';

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

export const TestStore = signalStore(
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
  withQuery('userQueryWithAssociatedClientState', (store) =>
    query(
      {
        params: store.selectedUserId,
        loader: ({ params }) => {
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
          return lastValueFrom(
            of({
              id: '1',
              name: 'John Doe',
              email: 'a@a.fr',
            }).pipe(delay(2000))
          );
        },
      },
      clientState({
        path: 'userDetails.user',
      })
    )
  ),
  withQuery('bffQueryProductsAndCategories', (store) =>
    query(
      {
        params: store.selectedUserId,
        loader: ({ params }) => {
          console.log('params', params);
          const result = new BehaviorSubject<User | undefined>(undefined);
          return lastValueFrom(
            of({
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
            }).pipe(delay(2000))
          );
        },
      },
      clientState({
        path: 'userDetails.bff',
        mapResourceToState: ({ queryResource }) => ({
          products: queryResource.value()?.products,
          categories: queryResource.value()?.categories,
        }),
      })
    )
  ),
  withProps(() => {
    const updateUserSrc = signal<User | undefined>(undefined);
    const resourceTest = resource({
      params: updateUserSrc,
      loader: ({ params }) => {
        console.log('params', params);
        return lastValueFrom(of(params).pipe(delay(2000)));
      },
    });

    return {
      updateUserSrc,
      resourceTest,
    };
  }),
  withMutation(
    'userName',
    (store) =>
      mutation({
        method: (userName: string) => {
          console.log('userName', userName);
          return {
            ...store.userDetails().user,
            name: userName,
          };
        },
        loader: ({ params }) => {
          console.log('params', params);
          return lastValueFrom(of(params).pipe(delay(2000)));
        },
      }),
    (store) => ({
      queriesEffects: {
        userQueryWithAssociatedClientState: {
          optimistic: ({ mutationParams, queryResource }) => {
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
  )
);

// todo checker pourquoi il n'y a pas de value quand ça charge
