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
  withMethods((store) => ({
    setName: (name: string) => {
      patchState(store, (state) => ({
        user: { ...state.user, name },
      }));
    },
  })),
  withFeature(
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
  )
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
