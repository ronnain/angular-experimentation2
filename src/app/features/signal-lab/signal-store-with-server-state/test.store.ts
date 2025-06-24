import { signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { withQueryById } from './signal-store-with-server-state';
import { resourceById } from './resource-by-id-signal-store';

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
  withQueryById((store) => {
    return {
      resourceName: 'usersById',
      resource: resourceById({
        params: store.selectedUserId,
        loader: ({ params }) => {
          console.log('params', params);
          return Promise.resolve({
            id: '1',
            name: 'John Doe',
            email: 'a@a.fr',
          });
        },
        identifier: (params) => params,
      }),
    };
  })
);
