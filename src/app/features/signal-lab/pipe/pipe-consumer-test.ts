import { set } from 'fp-ts';
import {
  MySignalStore,
  withState,
  withMethods,
  patchState,
  withFeature,
} from './pipe-pattern';

const myStore = MySignalStore(
  // (inputs) => ({})
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
  // })
  withMethods((store) => ({
    setName: (name: string) => {
      return patchState(store, (state) => ({
        user: { ...state.user, name },
      }));
    },
  }))
  // withSelectedUser()
);

function withSelectedUser() {
  return withFeature(
    withState({
      selectedUser: -1,
    }),
    withMethods((store) => ({
      setSelectedUser: (id: number) => {
        return patchState(store, (state) => ({
          selectedUser: id,
        }));
      },
    }))
  );
}
