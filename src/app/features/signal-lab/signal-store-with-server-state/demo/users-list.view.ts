import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { User } from '../../resource-store/api.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <h2>User List</h2>

    <ul>
      @for (user of userList(); track user.id) {
      <li>
        <a [routerLink]="[user.id]">
          {{ user.name }}
        </a>
      </li>
      }
    </ul>

    <router-outlet />
  `,
})
export default class UserListView {
  protected readonly userList = signal<User[]>([
    { id: '1', name: 'Romain' },
    { id: '2', name: 'Alice' },
    { id: '3', name: 'Bob' },
  ]);
}
