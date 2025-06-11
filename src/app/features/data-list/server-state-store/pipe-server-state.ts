import { init } from 'fp-ts/lib/ReadonlyNonEmptyArray';
import { hasProcessingItem } from '../store-helper';
import { withSelectors } from '../storev3';
import { patchState } from '../../signal-lab/pipe/pipe-pattern';
import { serverStateStore, withQuery } from './server-state-store';
import { of, Subject } from 'rxjs';

type User = {
  id: string;
  name: string;
  email: string;
};

// all async actions are stated by default
// always handle auto async actio n status
const store = serverStateStore(
  withEntities(
    withEntitiesQuery({
      src: () => store.state.pagination$,
      fn: (pagination: Pagniation) => pagination,
      query: ({ data }) => this.dataListService.getDataList$(data),
      entitiesIdentifier: (result) => result.users,
      // can inform about the total number of items...
      derivedState: (result) => ({
        total: derived(result.total, {
          initialValue?: 0,
          stated: true, // {total: {value: 0, isLoading: boolean, error: any}}
        }),
        maxPage: result.maxPage
      }),
      initialState: {
        entities: [] as User[],
        total: 0,
      },
    }),
    withMutations((store, entitiesStore) => ({
      // granularAction can have src or fn, but can be always manually triggered
      update: grannularMutation({
        src: (item: User) => item,
        fn: (item: User) => item, // or
        query: ({ actionSrc }) => {
          return this.dataListService.updateItem(actionSrc);
        },
        operator: switchMap,
        disableOptimisticUpdate: true,
      }),
      createUser: grannularMutation({
        src: (user: User) => user,
        fn: (user: User) => user, // or
        query: ({ actionSrc }) => {
          return this.dataListService.createUser(actionSrc);
        },
        operator: switchMap,
        optimisticEntity: ({ state }) => state.pagination === 1,
      }),
      createdFromWebsocket: reactiveMutation(
        WebSocket.userCreated,
        ({ actionSrc }) => {
          patchEntities(store, (state) => addCreatedUser);
        }
      ),
      bulkUpdate: bulkMutation(),
    })),
    withEvents((store, storeEntities) => ({
      error$ : merge(storeEntities.createUser.error$, storeEntities.update.error$),
    }))
    withMutation((store, storeEntities) => ({
      refreshOne: grannularMutation({
        src: () => storeEntities.events.error$,
        fn: (user: User) => user, // or
        query: ({ actionSrc }) => {
          return this.dataListService.createUser(actionSrc);
        },
        operator: switchMap,
        optimisticEntity: ({ state }) => state.pagination === 1,
      })
    }))
    withGranularSelectors((store) => ({
      isLoading: selector((state) => hasProcessingItem(state.path)), // de base
    })),
    withSelectors((state) => ({
      total: selector((state) => state.path.length),
    })),
    {
      path:'path',
      preserveOutOfContextMutations: true,
      preserveMutationTime: 5000,
      staleTime: 1000 * 60 * 5, // 5 minutes...
    }
  ),
  withSelectors((state) => ({
    random: selector(otherstore.state.random), // memoization, deep equality check
    hasProcessing: selector((state) => ...), // memoization, deep equality check
  }))
);

const storeUser = serverStateStore(
  withQuery({
    src: () => store.state.pagination$,
    query: ({ data }) => this.dataListService.getDataList$(data),
  }),
  withMutations(() => ({
    update$: mutation({
      src: () => update$,
      query: ({ actionSrc }) => {
        return this.dataListService.updateItem(actionSrc);
      },
      operator: switchMap,
    }),
  }))
);

storeUser.events.update$ // { status: 'loading' | 'success' | 'error', value?: User, error: any }

const pagination$ = new Subject<{
  page: number;
  pageSize: number;
}>();
const storeUser = serverStateStore(
  withQuery({
    params: () => pagination$,
    query: ({ params }) => of({
      name: 'John Doe',
      email: 'john.doe@example.com',
    }),
  }),
  withMutations(() => ({
    update$: mutation({
      src: () => update$,
      query: ({ actionSrc }) => {
        return this.dataListService.updateItem(actionSrc);
      },
      operator: switchMap,
    }),
  }))
);
