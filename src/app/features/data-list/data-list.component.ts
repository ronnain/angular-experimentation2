import { Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DataItem, DataListService } from './data-list.service';
import { CommonModule } from '@angular/common';
import {
  BehaviorSubject,
  exhaustMap,
  groupBy,
  mergeMap,
  Observable,
  Subject,
  switchMap,
  timer,
} from 'rxjs';
import { entityLevelAction, EntityLevelActionConfig, Store2 } from './storev2';
import { statedStream } from '../../util/stated-stream/stated-stream';

type Pagination = {
  page: number;
  pageSize: number;
};

@Component({
  selector: 'app-data-list',
  templateUrl: './data-list.component.html',
  styleUrls: ['./data-list.component.css'],
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
})
export class DataListComponent {
  private dataListService = inject(DataListService);

  createItem$ = new Subject<DataItem>();
  updateItem$ = new Subject<DataItem & { updateInfo: 'error' | 'success' }>();
  deleteItem$ = new Subject<DataItem>();
  pagination$ = new BehaviorSubject<Pagination>({
    page: 1,
    pageSize: 3,
  });

  private readonly updatingItem$ = this.updateItem$.pipe(
    groupBy((updateItem) => updateItem.id),
    mergeMap((group$) => {
      return group$.pipe(
        switchMap((updateItem) =>
          statedStream(this.dataListService.updateItem(updateItem), updateItem)
        )
      );
    })
  );

  vm$ = this.pagination$.pipe(
    switchMap((pagination) =>
      statedStream(this.dataListService.getDataList$(pagination), [])
    )
  );

  previousPage() {
    const currentPage = this.pagination$.value.page;
    if (currentPage > 1) {
      this.pagination$.next({
        ...this.pagination$.value,
        page: currentPage - 1,
      });
    }
  }

  nextPage() {
    const currentPage = this.pagination$.value.page;
    this.pagination$.next({
      ...this.pagination$.value,
      page: currentPage + 1,
    });
  }

  updateItemTest(item: DataItem) {
    this.updateItem$.next({
      ...item,
      name: 'Item ' + Math.floor(Math.random() * (1000 - 100 + 1) + 100),
      updateInfo: 'success',
    });
  }
  updateItemError(item: DataItem) {
    this.updateItem$.next({
      ...item,
      updateInfo: 'error',
    });
  }

  deleteItemTest(item: DataItem) {
    this.deleteItem$.next(item);
  }

  createItemTest() {
    const id = Math.floor(Math.random() * 1000).toString();
    const newItemWithId = {
      id,
      name: 'Created Item ' + ' - ' + id,
      optimisticId: id.toString(),
    };
    this.createItem$.next(newItemWithId);
  }
}
