import {
  MySignalStore,
  withState,
  patchState,
  withFeature,
  withMethods,
} from './pipe-pattern';

const myStore = MySignalStore(
  withState({
    user: {
      id: '1',
      name: 'test',
    },
  }),
  // (store) => ({
  //   methods: {
  //     setName: (name: string) => {
  //       return patchState(store, (state) => ({
  //         user: { ...state.user, name },
  //       }));
  //     },
  //   },
  // }),
  withMethods((store) => ({
    setName: (name: string) => {
      patchState(store, (state) => ({
        user: { ...state.user, name },
      }));
    },
  })),
  withSelectedUser()
);

function withSelectedUser() {
  return withFeature(
    withState({
      selectedUser: -1,
    }),
    withMethods((store) => ({
      setSelectedUser: (id: number) => {
        patchState(store, () => ({
          selectedUser: id,
        }));
      },
    }))
  );
}
