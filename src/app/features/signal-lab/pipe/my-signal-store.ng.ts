import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  resource,
  ResourceStatus,
  signal,
} from '@angular/core';
import { resourceById, ResourceByIdRef } from '../resource-by-id';
import {
  MySignalStore,
  patchState,
  withFeature,
  withMethods,
  withState,
} from './pipe-pattern';

type Pagination = {
  page: number;
  pageSize: number;
};

@Component({
  selector: 'app-resource-by-group',
  standalone: true,
  imports: [CommonModule],
  template: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ResourceByGroupComponent {
  private readonly myStore = MySignalStore(
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
    withFeature((inputs) => ({
      state: {
        selectedUser: -1,
      },
      methods: {
        setSelectedUser: (id: number) => {
          return {
            ...inputs.state,
            selectedUser: id,
          };
        },
      },
    }))
  );
}
