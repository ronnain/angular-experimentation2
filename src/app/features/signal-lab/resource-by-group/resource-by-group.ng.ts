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
} from './signal-server-state';
import { resourceById } from '../resource-by-id';

type Pagination = {
  page: number;
  pageSize: number;
};

type Actions = 'GET';
type ActionStatus = ResourceStatus;

// Step 1: Define the state structure and actions using ServerStateContext
type UsersState = ServerStateContext<{
  stateType: {
    users: User[];
    status: Partial<Record<Actions, ActionStatus>>;
  };
  actions: Actions;
}>;

@Component({
  selector: 'app-resource-by-group',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resource-by-group.ng.html',
  styleUrls: ['./resource-by-group.ng.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ResourceByGroupComponent {
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

  protected readonly updateById = resourceById({
    params: this.updateItem,
    identifier: (params) => params.id,
    loader: ({ params }) => {
      return this.apiService.updateItem(params as User);
    },
  });

  protected readonly usersState = signalServerState<UsersState>()(
    {
      GET: action<UsersState>()({
        resource: () =>
          resource({
            params: () => this.pagination(),
            loader: ({ params }) => this.apiService.getDataList$(params),
          }),
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
    },
    {
      initialState: {
        users: [],
        status: {},
      },
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
