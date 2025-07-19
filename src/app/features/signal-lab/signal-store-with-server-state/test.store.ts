import { signalStore, withProps, withState } from '@ngrx/signals';
import { query, withQuery } from './with-query';
import { BehaviorSubject, delay, lastValueFrom, of } from 'rxjs';
import { inject, resource, signal } from '@angular/core';
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
          return lastValueFrom(
            of({
              id: '1',
              name: 'John Doe',
              email: 'a@a.fr',
            }).pipe(delay(2000))
          );
        },
      }
      // clientState({
      //   path: 'userDetails.user',
      // })
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
                {
                  id: '2',
                  name: 'Product 2',
                  price: 200,
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
      }
      // clientState({
      //   path: 'userDetails.bff',
      //   mapResourceToState: ({ queryResource }) => ({
      //     products: queryResource.value()?.products,
      //     categories: queryResource.value()?.categories,
      //   }),
      // })
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
  ),
  withMutation(
    'addCategory',
    () =>
      mutation({
        method: (category: Category) => category,
        loader: ({ params }) => {
          console.log('params', params);
          return lastValueFrom(of(params).pipe(delay(2000)));
        },
      }),
    () => ({
      queriesEffects: {
        bffQueryProductsAndCategories: {
          optimisticPatch: {
            categories: ({ mutationParams, queryResource }) => {
              const queryValue = queryResource.value();
              if (!queryValue) {
                throw new Error('Query resource is not available');
              }
              const newCategories = [...queryValue.categories, mutationParams];
              return newCategories;
            },
          },
          reload: {
            onMutationResolved: true,
          },
        },
      },
    })
  )
);

const Store = signalStore(
  {
    providedIn: 'root',
  },
  withState({
    selectedUserId: undefined as string | undefined,
    user: undefined as User | undefined,
  }),
  withQuery(
    'userDetails',
    (store) =>
      query({
        params: store.selectedUserId,
        loader: ({ params }) =>
          lastValueFrom(
            of({
              id: params,
              name: 'John Doe',
              email: 'a@a.fr',
            }).pipe(delay(2000))
          ),
      }),
    (store) => ({
      associatedClientState: {
        path: 'user',
      },
    })
  ),
  withMutation(
    'user',
    (store) =>
      mutation({
        method: (user: User) => user,
        // Or  params: store.user
        loader: ({ params }) => lastValueFrom(of(params).pipe(delay(2000)));
      }),
    (store) => ({
      queriesEffects: {
        userDetails: {
          optimistic: ({ mutationParams }) => mutationParams,
          reload: {
            onMutationError: true,
          },
        },
      },
    })
  )
);

const store = inject(Store);
const queryStatus = store.userDetailsQuery.status(); // "idle" | "error" | "loading" | "reloading" | "resolved" | "local"
const queryValue = store.userDetailsQuery.value(); // {  id: string;  name: string;  email: string; }

const mutationStatus = store.userMutation.status(); // "idle" | "error" | "loading" | "reloading" | "resolved" | "local"
const mutationValue = store.userMutation.value(); // {  id: string;  name: string;  email: string; }

store.mutateUser({
  id: '1',
  name: 'Jane Doe',
  email: 'jane.doe@example.com',
});
