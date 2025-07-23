import { CommonModule } from '@angular/common';
import {
  Component,
  effect,
  inject,
  resource,
  Signal,
  signal,
} from '@angular/core';
import { TestStore } from './test.store';

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
  `,
})
export default class ViewComponent {
  protected readonly store = inject(TestStore);

  testCountRef = signal('Test');

  // testStream = resource({
  //   params: () => '5',
  //   stream: ({ params }) => {
  //     const testSignal = signal(5);
  //     return new Promise<number>((resolve) => {
  //       resolve(testSignal());
  //     });
  //   },
  // });

  // constructor() {
  //   effect(() => console.log('test', this.testStream.value()));
  // }

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
