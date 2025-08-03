import { init } from "fp-ts/lib/ReadonlyNonEmptyArray";
import { hasProcessingItem } from "../store-helper";
import { withSelectors } from "../storev3";

type User = {
  id: string;
  name: string;
  email: string;
};

// all async actions are stated by default
// always handle auto async actio n status
const store = pipeServerStore(
  withState({ // peut être changé via actions
    filter: {
        search: '',
        status: 'all',
    },
    userCreation: undefined as User | undefined, // can be set via action
    availableStatuses: 'all' // string
  }),
  withAction(() => ({
    search: (search: string) => {
        patchState(store, (state)=> ({
            filter: {
                ...state.filter,
                search,
            },
        }))
    },
    userCreationChange: (user: Partial<User> | undefined) => patchState(store, (state) => ({
        userCreation: user ? { ...state.userCreation, ...user } : undefined,
        })),
    loadAvailableStatuses: asyncAction(() => {
        src/fromNaturalTransformation...
        operator:...
    })

  }))
  withReactiveState(()  => ({ // withProps ?
    pagination: pagination$, // ne peut pas être modifié via action ? Ou se fait reset à chaque fois que la source change ? Non sinon c'est une action
  })),
  withEntities("path",
    withState([] as User[]),
    withActions((store) => ({
    get: reactiveAction({
        src: () => store.state.pagination$,
        query: ({ data }) => this.dataListService.getDataList$(data),
        identifier: (result) => result.users,
        // can inform about the total number of items...
        derivedState (result) => ({
            total: derived(result.total, {
                stated: true,
            }),
        })
    }),
    // granularAction can have src or fn, but can be always manually triggered
    update: grannularAction({
        src: (item: User) => item,
        fn: (item: User) => item, // or
        query: ({ actionSrc }) => {
            return this.dataListService.updateItem(actionSrc);
        },
        operator: switchMap,
        // identifier ? // si different type
        optimisticEntity: ({ actionSrc }) => actionSrc,
        disableOptimisticUpdate: true,
    }),
    createUser: grannularAction({
        src: (user: User) => user,
        fn: (user: User) => user, // or
        query: ({ actionSrc }) => {
            return this.dataListService.createUser(actionSrc);
        },
        operator: switchMap,
        optimisticEntity: ({ state }) => state.pagination === 1 ,
    }),
    bulkUpdate: asyncAction(),
    withReducers((store) => ({
        webSocketUserCreated: on(WebSocket.userCreated, ({ actionSrc }) => {
            patchEntities(store, (state) => addCreatedUser)
        })
    }))
    withGranularSelectors((store) => ({
      isLoading: selector(state => hasProcessingItem(state.path, 'get')),
    })
    withSelectors((state) => ({
      total: selector(state => state.path.length), // or state.path().length
    })),
  })),

  withSelectors(state => {
    random: selector(otherstore.state.random) // memoize ?
    hasProcessing: selector(state => //distinct) // memoize ?
  })
);
