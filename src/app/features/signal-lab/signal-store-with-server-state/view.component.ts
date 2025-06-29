import { CommonModule } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
import { testStore } from './test.store';

@Component({
  selector: 'app-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    userQueryWithAssociatedClientState:
    {{ store.userQueryWithAssociatedClientState.value() | json }} &&
    {{ store.userQueryWithAssociatedClientState.status() }}<br />
    userState:
    {{ store.userDetails() | json }}<br />
  `,
})
export default class ViewComponent {
  protected readonly store = inject(testStore);

  constructor() {
    // effect(() => {
    //   const simpleQueryValue = this.store.simpleQuery.value();
    //   console.log('simpleQueryValue:', simpleQueryValue);
    // });
  }
}
