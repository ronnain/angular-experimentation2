import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  resource,
  ResourceStatus,
  signal,
} from '@angular/core';
import { User, ApiService } from './api.service';
import {
  ServerStateContext,
  signalServerState,
  action,
} from './resource-store';
import { resourceById, ResourceByIdRef } from '../resource-by-id';

type Pagination = {
  page: number;
  pageSize: number;
};

type Actions = 'GET' | 'UPDATE';
type ActionStatus = ResourceStatus;

// Step 1: Define the state structure and actions using ServerStateContext
type UsersState = ServerStateContext<{
  stateType: {
    users: (User & {
      ui?: {
        updateStatus: ResourceStatus;
      };
    })[];
    status: Partial<Record<Actions, ActionStatus>>;
  };
  actions: Actions;
}>;

@Component({
  selector: 'app-resource-by-group',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resource-store.ng.html',
  styleUrls: ['./resource-store.ng.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ResourceByGroupV2Component {
  private readonly apiService = inject(ApiService);

  protected updateError = this.apiService.updateError;
  protected toggleUpdateError() {
    this.updateError.update((state) => !state);
  }

  // signal sources
  private deleteItem = signal<User | undefined>(undefined);
  private pagination = signal<Pagination>({
    page: 1,
    pageSize: 3,
  });

  private updateItem = signal<User | undefined>(undefined);

  // todo faire un truc du style withActions, withSelectors, ... et permettre la composition ?
  // todo add an update trigger (on sourceChange, imprative, etc.)
  // each function must return {action, selector, }
  // withActions => {action: {GET, UPDATE}}
  // selector: {totalUser}
  // withFeature: {action: {SPECIALCALLBACK}, selector: {specialCallback}}
  // withEntityStatus<UsersState>: {selectors: {usersWithStatus}}

  // resourceStore<..?>({initialstate}, withActions(...), WithSelectors(...), withFeature(...))
  protected readonly usersState = signalServerState<UsersState>()(
    {
      GET: action<UsersState>()({
        resourceRef: () =>
          resource({
            params: () => this.pagination(),
            loader: ({ params }) => this.apiService.getDataList$(params),
          }),
        // TODO REMOVE THE GROUPID HERE
        reducer: ({ actionResource, state }) => ({
          // do not forget to handle the error case
          ...state,
          status: { ...state.status, GET: actionResource.status() },
          users:
            (actionResource.hasValue()
              ? actionResource.value()
              : state.users) ?? [],
        }),
      }),
      UPDATE: action<UsersState>()({
        resourceRef: () =>
          resourceById({
            params: this.updateItem,
            identifier: (params) => params.id,
            loader: ({ params }) => {
              return this.apiService.updateItem(params);
            },
          }),
        reducer: ({ actionResource, state, groupId }) => {
          console.log('groupId', groupId);
          // do not forget to handle the error case
          if (actionResource.status() === 'error') {
            const users = state.users.map((user) => {
              if (user.id === groupId) {
                return {
                  ...user,
                  ui: { updateStatus: actionResource.status() },
                };
              }
              return user;
            });
            return {
              ...state,
              users,
              status: { ...state.status, UPDATE: actionResource.status() },
            };
          }
          const item =
            actionResource.status() === 'loading'
              ? this.updateItem()
              : actionResource.value();
          const users = state.users.map((user) => {
            if (user.id === item?.id) {
              return {
                ...user,
                ui: { updateStatus: actionResource.status() },
              };
            }
            return user;
          });
          return {
            ...state,
            status: { ...state.status, UPDATE: actionResource.status() },
            users,
          };
        },
      }),
    },
    {
      initialState: {
        users: [],
        status: {},
      },
    },
    {
      // todo try to make selector to be updated only if the part of the state it depends on changes
      selectors: ({ state }) =>
        ({
          totalUser: state.users.length,
        } as const),
    }
  );

  protected previousPage() {
    this.pagination.update((state) => ({
      ...state,
      page: state.page - 1,
    }));
  }

  protected nextPage() {
    this.pagination.update((state) => ({
      ...state,
      page: state.page + 1,
    }));
  }

  protected updateItemFn(item: User) {
    this.updateItem.set({
      ...item,
      name: 'Item ' + Math.floor(Math.random() * (1000 - 100 + 1) + 100),
    });
  }

  protected deleteItemFn(item: User) {
    this.deleteItem.set(item);
  }
}
