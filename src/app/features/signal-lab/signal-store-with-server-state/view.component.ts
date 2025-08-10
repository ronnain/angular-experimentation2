import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  EffectRef,
  inject,
  Injector,
  linkedSignal,
  resource,
  ResourceRef,
  Signal,
  signal,
  untracked,
} from '@angular/core';
import { DeclarativeStore, TestStore } from './test.store';
import { nestedEffect } from './types/util';
import { signalStore, withState } from '@ngrx/signals';
import { withQueryById } from './with-query-by-id';
import { User } from '../resource-by-group/api.service';
import { delay, lastValueFrom, map, of } from 'rxjs';
import { queryById } from './query-by-id';
import { withMutation } from './with-mutation';
import { mutation } from './mutation';
import { withQuery } from './with-query';
import { rxQuery } from './rx-query';

const StoreTest = signalStore(
  withMutation('userEmail', () =>
    mutation({
      method: ({ id, email }: { id: string; email: string }) => ({
        id,
        email,
      }),
      loader: ({ params }) => {
        return lastValueFrom(
          of({
            id: params.id,
            name: 'Updated Name',
          } satisfies User).pipe(
            map((data) => {
              throw new Error('Error during mutation');
              return data;
            })
          )
        );
      },
    })
  ),
  withQuery(
    'user',
    () =>
      rxQuery({
        params: () => '5',
        stream: ({ params }) => {
          return of({
            id: params,
            name: 'John Doe',
          }).pipe(delay(10));
        },
      }),
    () => ({
      on: {
        userEmailMutation: {
          reload: {
            onMutationError: ({ mutationParams }) =>
              mutationParams.id === 'error',
          },
        },
      },
    })
  )
);

const testUsersParam = signal<number>(5);

const testQueryById = signalStore(
  { providedIn: 'root' },
  withState({
    users: [] as User[],
  }),
  withMutation('user', () =>
    mutation({
      method: (user: User) => user,
      loader: async ({ params }) => params,
    })
  ),
  withQueryById(
    'loadUser',
    () =>
      queryById({
        params: testUsersParam,
        loader: ({ params }) => {
          console.log('params', params);
          return lastValueFrom(
            of<User>({
              id: '' + params,
              name: 'John Doe',
            }).pipe(delay(10))
          );
        },
        identifier: (params) => params,
      }),
    (store) => ({
      state: {
        users: ({
          queryParams,
          queryResource,
          queryResources,
          queryIdentifier,
        }) => {
          console.log('store.users()', store.users());
          console.log('queryResource.value()', queryResource.value());
          return [
            ...store
              .users()
              .filter((user) => user.id !== queryResource.value()?.id),
            queryResource.value(),
          ];
        },
      },

      on: {
        userMutation: {
          filter: ({ queryIdentifier, mutationParams }) =>
            queryIdentifier === mutationParams.id,
          optimisticPatch: {
            name: ({ mutationParams }) => mutationParams.name,
          },
        },
      },
    })
  )
);

@Component({
  selector: 'app-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- <button
      class="btn"
      (click)="addCategory()"
      [disabled]="store.addCategoryMutation.status() === 'loading'"
    >
      Add category
    </button>
    <button
      class="btn"
      (click)="addCategory2()"
      [disabled]="store.addCategoryMutation.status() === 'loading'"
    >
      Add category
    </button>
    <br />

    bffQueryProductsAndCategories:
    <pre>{{ store.bffQueryProductsAndCategoriesQuery.status() | json }}</pre>
    <br />
    userState:
    <pre>{{ store.userDetails() | json }}</pre>
    <hr />
    Update user ({{ store.userNameMutation.status() }})
    <pre>{{
      (store.userNameMutation.hasValue()
        ? store.userNameMutation.value()
        : null
      ) | json
    }}</pre>
    error:
    <pre>{{ $any(store.userNameMutation).error() | json }}</pre>

    resourceTest :
    <pre>{{ store.resourceTest.value() | json }}</pre>

    <br />

    <button class="btn" (click)="store.mutateUserName('Romain Success')">
      Update User
    </button>
    <button
      class="btn"
      (click)="
        store.updateUserSrc.set({
          id: 'mutated',
          name: 'Romain Success',
          email: ''
        })
      "
    >
      Update User Src
    </button>

    <hr />
    <h2>Declarative Store</h2>
    <button
      class="btn"
      (click)="
        declarativeStore.mutateUserEmail({
          id: '5',
          email: 'mutated@emaiL.com'
        })
      "
    >
      Mutate User Email
    </button>
    userQuery({{ declarativeStore.userQuery.status() | json }}) :
    <pre>{{ declarativeStore.userQuery.value() | json }}</pre>
     -->
    <button
      (click)="$any(testNestedEffect())['0'].set(testNestedEffect()['0']() + 1)"
    >
      Trigger 0
    </button>
    <button
      (click)="$any(testNestedEffect())['1'].set(testNestedEffect()['1']() + 1)"
    >
      Trigger 1
    </button>
    <button (click)="add4()">Add 4</button>
    <button
      (click)="$any(testNestedEffect())['4'].set(testNestedEffect()['4']() + 1)"
    >
      Trigger 4
    </button>
    <button (click)="testUsersParam.set(testUsersParam() + 1)">
      Load User
    </button>
    @for(resourceData of testQueryByIdResources(); track $index; let idx =
    $index) {
    <div>
      {{ resourceData[1]?.value() | json }}
      <button (click)="updateUser(resourceData[1])">Update</button>
    </div>

    }

    <div>testQueryById:users: {{ testQueryById.users() | json }}</div>
    <hr />
    <button (click)="mutationUserQueryById()">Trigger Mutation</button>
    <hr />
    storeTest userEmailMutation status{{ storeTest.userEmailMutation.status() }}
  `,
  providers: [StoreTest],
})
export default class ViewComponent {
  protected readonly store = inject(TestStore);
  protected readonly declarativeStore = inject(DeclarativeStore);
  private readonly injector = inject(Injector);
  testUsersParam = testUsersParam;
  protected readonly storeTest = inject(StoreTest);

  mutationUserQueryById() {
    this.testQueryById.mutateUser({
      id: '5',
      name: 'updated',
    });
  }
  add4() {
    this.testNestedEffect.update((data) => ({
      ...data,
      '4': signal(0),
    }));
  }

  protected readonly testQueryById = inject(testQueryById);
  testQueryByIdResources = computed(() =>
    Object.entries(this.testQueryById.loadUserQueryById())
  );
  updateUser(resource: ResourceRef<NoInfer<User>> | undefined) {
    if (!resource) {
      return;
    }
    resource.update((data) => ({
      ...data,
      name: `Updated ${data.name}`,
    }));
  }

  testCountRef = signal('Test');

  testNestedEffect = signal<Record<string, Signal<number>>>({
    '0': signal(0),
    '1': signal(1),
    '2': signal(2),
  });
  newKeysForNestedEffect = linkedSignal<any, any>({
    source: this.testNestedEffect,
    computation: (currentSource, previous) => {
      const currentKeys = Object.keys(currentSource);
      const previousKeys = Object.keys(previous?.source ?? {});
      const newKeys = currentKeys.filter((key) => !previousKeys.includes(key));
      return newKeys.length
        ? {
            newKeys,
          }
        : previous?.value;
    },
  });

  constructor() {
    effect(() => {
      if (!this.newKeysForNestedEffect().newKeys) {
        return;
      }
      this.newKeysForNestedEffect().newKeys.forEach((key: string) => {
        nestedEffect(this.injector, () =>
          console.log(
            `this.testNestedEffect()[${key}]`,
            untracked(() => this.testNestedEffect())[key]()
          )
        );
      });
    });
  }

  addCategory() {
    this.store.mutateAddCategory({
      id: 'new-category',
      name: 'New Category',
    });
  }
  addCategory2() {
    this.store.mutateAddCategory({
      id: 'new-category2',
      name: 'New Category2',
    });
  }
}
