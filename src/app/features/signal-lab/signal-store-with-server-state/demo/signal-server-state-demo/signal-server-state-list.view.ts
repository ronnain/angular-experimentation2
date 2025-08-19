import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { ServerStateStore } from '../../server-state-store';
import {
  patchState,
  signalStoreFeature,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { withQueryById } from '../../with-query-by-id';
import { rxQueryById } from '../../rx-query-by-id';
import { withServices } from './util';
import { ApiService } from './api.service';
import { withMutationById } from '../../with-mutation-by-id';
import { rxMutationById } from '../../rx-mutation-by-id';

type Pagination = {
  page: number;
  pageSize: number;
};
export type User = {
  id: string;
  name: string;
};

// pagnitaion si on revient sur la précédente afficher la liste d'utilisateur qui devrait être save

const { UserListServerStateStore } = ServerStateStore(
  'userList',
  signalStoreFeature(
    withServices(() => ({
      api: inject(ApiService),
    })),
    withState({
      pagination: {
        page: 1,
        pageSize: 4,
      },
    }),
    withMutationById('userName', (store) =>
      rxMutationById({
        method: (user: User) => user,
        stream: ({ params: user }) => store.api.getItemById(user.id),
        identifier: (params) => params.id,
      })
    ),
    withQueryById(
      'users',
      (store) =>
        rxQueryById({
          params: store.pagination,
          identifier: (params) => params.page,
          stream: ({ params }) =>
            store.api.getDataList$({
              page: params.page,
              pageSize: params.pageSize,
            }),
        }),
      () => ({
        on: {
          userNameMutationById: {
            filter: ({ queryResource, mutationIdentifier }) =>
              queryResource
                .value()
                .some((user) => user.id === mutationIdentifier),
            optimisticUpdate: ({ mutationParams, queryResource }) =>
              queryResource
                .value()
                .map((user) =>
                  user.id === mutationParams.id
                    ? { ...user, name: mutationParams.name }
                    : user
                ),
          },
        },
      })
    ),
    withMethods((store) => ({
      nextPage: () =>
        patchState(store, (state) => ({
          pagination: {
            ...state.pagination,
            page: state.pagination.page + 1,
          },
        })),
      previousPage: () =>
        patchState(store, (state) => ({
          pagination: {
            ...state.pagination,
            page: state.pagination.page - 1,
          },
        })),
      updateUserWithARandomName: (user: User) =>
        store.mutateUserName({
          id: user.id,
          name: `Random Name ${Math.floor(Math.random() * 100)}`,
        }),
    })),
    withComputed((store) => ({
      currentUserList: computed(
        () => store.usersQueryById()[store.pagination.page()]?.value() ?? []
      ),
      currentUserListStatus: computed(
        () => store.usersQueryById()[store.pagination.page()]?.status() ?? {}
      ),
    }))
  ),
  {
    providedIn: 'root',
  }
);

@Component({
  selector: 'app-server-state-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './signal-server-state-list.view.html',
  styleUrls: ['./signal-server-state-list.view.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SignalServerStateListViewComponent {
  protected readonly userListServerStateStore = inject(
    UserListServerStateStore
  );
}
