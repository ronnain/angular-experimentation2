import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { TestStore } from './test.store';

@Component({
  selector: 'app-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      class="btn"
      (click)="addCategory()"
      [disabled]="store.addCategory.status() === 'loading'"
    >
      Add category
    </button>
    <button
      class="btn"
      (click)="addCategory2()"
      [disabled]="store.addCategory.status() === 'loading'"
    >
      Add category
    </button>
    <br />

    bffQueryProductsAndCategories:
    <pre>{{ store.bffQueryProductsAndCategories.status() | json }}</pre>
    <br />
    userState:
    <pre>{{ store.userDetails() | json }}</pre>
    <hr />
    Update user ({{ store.userName.status() }})
    <pre>{{
      (store.userName.hasValue() ? store.userName.value() : null) | json
    }}</pre>
    error:
    <pre>{{ $any(store.userName).error() | json }}</pre>

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

  constructor() {}

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
