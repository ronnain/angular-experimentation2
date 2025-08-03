import { CommonModule, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  MySignalStore,
  patchState,
  withFeature,
  withMethods,
  withState,
} from './pipe-pattern';
import { set } from 'fp-ts';

type Pagination = {
  page: number;
  pageSize: number;
};

@Component({
  selector: 'app-resource-by-group',
  standalone: true,
  imports: [CommonModule, JsonPipe],
  templateUrl: `./my-signal-store.ng.html`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ResourceByGroupComponent {
  protected readonly myStore = MySignalStore(
    withState({
      user: {
        id: '1',
        name: 'test',
      },
    }),
    withMethods((store) => ({
      setName: (name: string) => {
        return patchState(store, (state) => ({
          user: { ...state.user, name },
        }));
      },
    })),
    withFeature(
      withState({
        role: 'admin',
      }),
      withMethods((store) => ({
        setRole: (role: string) => {
          return patchState(store, () => ({
            role,
          }));
        },
      }))
    )
  );

  // Method to update name from input
  protected updateName(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.myStore.methods.setName(input.value);
  }

  protected setRole(role: 'admin' | 'customer'): void {
    this.myStore.methods.setRole(role);
  }
}
