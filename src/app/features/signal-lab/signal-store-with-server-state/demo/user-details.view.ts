import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { injectPluggableUserDetailsServerState } from './user-details.store';

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2>User Details (status: {{ store.userQuery.status() }}) :</h2>

    @if(store.userQuery.hasValue()) {
    <p>ID: {{ store.userQuery.value().id }}</p>
    <p>Name: {{ store.userQuery.value().name }}</p>
    }
  `,
})
export default class UserDetailsView {
  readonly userId = input.required<string>();

  protected readonly store = injectPluggableUserDetailsServerState({
    selectedId: this.userId,
  });
}
