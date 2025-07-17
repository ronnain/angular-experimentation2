import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { TestStore } from './test.store';

@Component({
  selector: 'app-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- userQueryWithAssociatedClientState ({{
      store.userQueryWithAssociatedClientState.status()
    }}):
    <pre>{{ store.userQueryWithAssociatedClientState.value() | json }}</pre> -->
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

  constructor() {
    // effect(() => {
    //   const t = this.testCountRef();
    //   this.store.userQueryWithAssociatedClientState.value(); //used to trigger a re-evaluation
    //   console.log('this', this);
    // });
  }
}
