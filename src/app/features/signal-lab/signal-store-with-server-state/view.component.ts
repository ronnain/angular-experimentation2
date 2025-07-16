import { CommonModule } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
import { TestStore } from './test.store';

@Component({
  selector: 'app-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    userQueryWithAssociatedClientState ({{
      store.userQueryWithAssociatedClientState.status()
    }}):
    <pre>{{ store.userQueryWithAssociatedClientState.value() | json }}</pre>
    userState:
    <pre>{{ store.userDetails() | json }}</pre>
    <hr />
    <!-- Update user ({{ store.updateUserName.status() }})
    <pre>{{ store.updateUserName.value() | json }}</pre> -->

    <br />

    <!-- <button class="btn" (click)="store.mutateUpdateUserName('Romain Success')">
      Update User
    </button> -->
  `,
})
export default class ViewComponent {
  protected readonly store = inject(TestStore);

  constructor() {}
}
