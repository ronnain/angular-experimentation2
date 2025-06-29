import { signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { withQuery } from './with-query';
import { rxResource } from '@angular/core/rxjs-interop';
import { BehaviorSubject, delay, of } from 'rxjs';

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
  }))
);

// todo checker pourquoi il n'y a pas de value quand ça charge
