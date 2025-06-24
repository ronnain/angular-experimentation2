import { CommonModule } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
import { testStore } from './test.store';

@Component({
  selector: 'app-view',
  standalone: true,
  imports: [CommonModule],
  template: ` store: {{ store.usersById() | json }}<br />`,
})
export default class ViewComponent {
  protected readonly store = inject(testStore);

  constructor() {
    effect(() => {
      const users = this.store.usersById();
      console.log('Users by ID:', users);
    });
  }
}
