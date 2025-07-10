import {
  signalStore,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { withQuery } from './with-query';
import { rxResource } from '@angular/core/rxjs-interop';
import { BehaviorSubject, delay, of } from 'rxjs';
import { withMutation } from './with-mutation';
import { signal } from '@angular/core';

type User = {
  id: string;
  name: string;
  email: string;
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
    },
  }),
  // withQuery('simpleQuery', (store) =>
  //   resource({
  //     params: store.selectedUserId,
  //     loader: ({ params }) => {
  //       console.log('params', params);
  //       return new Promise<User>((resolve) => {
  //         setTimeout(() => {
  //           resolve({
  //             id: '1',
  //             name: 'John Doe',
  //             email: 'a@a.fr',
  //           });
  //         }, 3000);
  //       });
  //     },
  //   })
  // ),
  //! Ce qui n'est pas ouf, c'est que ça propose les méthodes de `resource` et pas de `rxResource`
  withQuery('userQueryWithAssociatedClientState', (store) => ({
    resource: rxResource({
      params: store.selectedUserId,
      stream: ({ params }) => {
        console.log('params', params);
        const result = new BehaviorSubject<User | undefined>(undefined);

        setTimeout(() => {
          result.next({
            id: '1',
            name: 'John Doe',
            email: 'a@a.fr',
          });
        }, 3000);
        setTimeout(() => {
          result.next({
            id: '2',
            name: 'John Doe2',
            email: 'a@a.fr',
          });
        }, 6000);
        return result.pipe(delay(1000));
      },
    }),
    clientStatePath: 'userDetails.user',
  })),
  withProps(() => ({
    _updateUserSrc: signal<User | undefined>(undefined),
  })),
  // TODO AJOUTER UNE METHOD POUR APPELER LA RESSOURCE, PRB, le résultat de la méthod doit passer en signal params , donc créer withResourceMutation, withRxResourceMutation, pareil pour withQuery
  withMutation('updateUser', (store) => ({
    mutation: rxResource({
      params: store._updateUserSrc,
      stream: ({ params }) => {
        console.log('params', params);
        return of(params).pipe(delay(2000));
      },
    }),
    queries: {
      userQueryWithAssociatedClientState: {
        reload: {
          onMutationLoading: true,
          onMutationError: true,
        },
      },
    },
  }))
);

// todo checker pourquoi il n'y a pas de value quand ça charge
