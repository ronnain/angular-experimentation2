import { CommonModule } from '@angular/common';
import {
  Component,
  effect,
  EffectRef,
  inject,
  Injector,
  linkedSignal,
  resource,
  Signal,
  signal,
  untracked,
} from '@angular/core';
import { DeclarativeStore, TestStore } from './test.store';
import { nestedEffect } from './types/util';
import { signalStore, withState } from '@ngrx/signals';
import { queryById, withQueryById } from './with-query-by-id';
import { User } from '../resource-by-group/api.service';
import { delay, lastValueFrom, of } from 'rxjs';

const testUsersParam = signal<number>(5);

const testQueryById = signalStore(
  { providedIn: 'root' },
  withState({
    users: [] as User[],
  }),
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
          debugger;
          return [...store.users(), queryResource.value()];
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
    <button
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

    <div>testQueryById:users: {{ testQueryById.users() | json }}</div>
    <button (click)="testUsersParam.set(testUsersParam() + 1)">
      Load User
    </button>
  `,
})
export default class ViewComponent {
  protected readonly store = inject(TestStore);
  protected readonly declarativeStore = inject(DeclarativeStore);
  private readonly injector = inject(Injector);
  testUsersParam = testUsersParam;

  protected readonly testQueryById = inject(testQueryById);

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
