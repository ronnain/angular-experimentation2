import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DataItem, DataListService } from './data-list.service';
import { CommonModule } from '@angular/common';
import {
  BehaviorSubject,
  groupBy,
  map,
  merge,
  mergeMap,
  Observable,
  scan,
  share,
  Subject,
  switchMap,
} from 'rxjs';
import {
  SatedStreamStatus,
  statedStream,
} from '../../util/stated-stream/stated-stream';

type StatedVm = {
  isLoading: boolean;
  isLoaded: boolean;
  hasError: boolean;
  error: undefined;
  result: {
    entity: DataItem;
    status: Partial<Record<'update', SatedStreamStatus>>;
  }[];
};
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

  updateItem$ = new Subject<DataItem>();
  pagination$ = new BehaviorSubject<Pagination>({
    page: 1,
    pageSize: 3,
  });

  private readonly updatingItem$ = this.updateItem$.pipe(
    // takeUntilDestroyed here will avoid to cancel the api call when using the pagination thanks to the constructor subscription, but it will avoid memory leak when navigating on another page
    takeUntilDestroyed(),
    groupBy((updateItem) => updateItem.id),
    mergeMap((group$) => {
      return group$.pipe(
        switchMap((updateItem) =>
          statedStream(this.dataListService.updateItem(updateItem), updateItem)
        )
      );
    }),
    share()
  );

  protected readonly vm$: Observable<StatedVm> = this.pagination$.pipe(
    switchMap((pagination) =>
      merge(
        statedStream(this.dataListService.getDataList$(pagination), []).pipe(
          map((dataList) => ({ dataList, type: 'dataList' as const }))
        ),
        this.updatingItem$.pipe(
          map((updatedItem) => ({
            updatedItem,
            type: 'update' as const,
          }))
        )
      )
    ),
    scan(
      (acc, curr) => {
        if (curr.type === 'dataList') {
          return {
            ...curr.dataList,
            result: curr.dataList.result.map((entity) => ({
              entity,
              status: {},
            })),
          } satisfies StatedVm;
        }

        if (curr.type === 'update') {
          return {
            ...acc,
            result: acc.result.map((entityData) => {
              if (entityData.entity.id === curr.updatedItem.result.id) {
                return {
                  entity: curr.updatedItem.result,
                  status: {
                    update: {
                      isLoading: curr.updatedItem.isLoading,
                      isLoaded: curr.updatedItem.isLoaded,
                      hasError: curr.updatedItem.hasError,
                      error: curr.updatedItem.error,
                    },
                  } satisfies Partial<Record<'update', SatedStreamStatus>>,
                };
              }
              return entityData;
            }),
          } satisfies StatedVm;
        }
        return acc;
      },
      {
        isLoading: true,
        isLoaded: false,
        hasError: false,
        error: undefined,
        result: [] as {
          entity: DataItem;
          status: Partial<Record<'update', SatedStreamStatus>>;
        }[],
      } satisfies StatedVm as StatedVm
    )
  );

  constructor() {
    // avoid to cancel the api call when using the pagination
    this.updatingItem$.subscribe((data) => console.log('updatingItem$', data));
  }

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
    });
  }
}
