import { signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { withQueryById } from './signal-store-with-server-state';
import { resourceById } from './resource-by-id-signal-store';

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
  }),
  withQueryById((store) => ({
    resourceName: 'usersById',
    resource: resourceById({
      params: store.selectedUserId,
      loader: ({ params }) => {
        console.log('params', params);
        return new Promise<User>((resolve) => {
          setTimeout(() => {
            resolve({
              id: '1',
              name: 'John Doe',
              email: 'a@a.fr',
            });
          }, 3000);
        });
      },
      identifier: (params) => params,
    }),
  }))
);

// todo checker pourquoi il n'y a pas de value quand ça charge
