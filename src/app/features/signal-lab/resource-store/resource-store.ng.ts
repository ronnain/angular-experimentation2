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
  templateUrl: './resource-store.ng.html',
  styleUrls: ['./resource-store.ng.css'],
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
    request: this.updateItem,
    identifier: (request) => request.id,
    loader: ({ request }) => {
      return this.apiService.updateItem(request as User);
    },
  });

  protected readonly usersState = signalServerState<UsersState>()(
    {
      GET: action<UsersState>()({
        resource: () =>
          resource({
            request: () => this.pagination(),
            loader: ({ request }) => this.apiService.getDataList$(request),
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
