import { Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DataItem, DataListService } from './data-list.service';
import { CommonModule } from '@angular/common';
import {
  BehaviorSubject,
  concatMap,
  exhaustMap,
  interval,
  map,
  race,
  skip,
  startWith,
  Subject,
  switchMap,
  takeWhile,
  timer,
} from 'rxjs';
import {
  addOrReplaceEntityIn,
  countEntitiesWithStatusByAction,
  extractAllErrors,
  hasProcessingItem,
  hasStatus,
  removedBulkEntities,
  removedEntity,
  totalProcessingItems,
  updateBulkEntities,
  updateEntity,
} from './store-helper';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  action,
  bulkAction,
  DataListStoreType,
  store,
  withActions,
  withBulkActions,
  withEntities,
  withSelectors,
} from './storev3';

type Pagination = {
  page: number;
  pageSize: number;
};

type MyDataListStoreType = DataListStoreType<{
  // autocompletion is enabled
  entity: DataItem;
  pagination: Pagination;
  actions: 'update' | 'delete' | 'create';
  bulkActions: 'bulkUpdate' | 'bulkDelete';
}>;

@Component({
  selector: 'app-data-list',
  templateUrl: './data-list.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
})
export class DataListComponent {
  private dataListService = inject(DataListService);

  private readonly DISAPPEAR_TIMEOUT = 5000;

  // sources
  private readonly pagination$ = new BehaviorSubject<Pagination>({
    page: 1,
    pageSize: 5,
  });
  // sources actions
  private readonly createItem$ = new Subject<DataItem>();
  private readonly updateItem$ = new Subject<{
    entity: DataItem;
    status: 'error' | 'success';
  }>();
  private readonly deleteItem$ = new Subject<DataItem>();
  private readonly bulkUpdate$ = new Subject<{
    entities: DataItem[];
    statusRequest: 'success' | 'error';
  }>();
  private readonly bulkDelete$ = new Subject<DataItem[]>();

  protected readonly selectedEntities$ = new BehaviorSubject<DataItem[]>([]);

  protected readonly dataList = store<MyDataListStoreType>()(
    withEntities<MyDataListStoreType>()({
      src: () => this.pagination$,
      query: ({ data }) => this.dataListService.getDataList$(data),
      entityIdSelector: (entity) => entity.id ?? entity.optimisticId,
    }),
    withActions<MyDataListStoreType>()({
      update: action<MyDataListStoreType>()({
        src: () => this.updateItem$,
        query: ({ actionSrc }) => {
          return this.dataListService.updateItem(actionSrc);
        },
        operator: switchMap,
        optimisticEntity: ({ actionSrc }) => actionSrc.entity,
      }),
      create: action<MyDataListStoreType>()({
        src: () => this.createItem$,
        query: ({ actionSrc }) => this.dataListService.addItem(actionSrc),
        operator: switchMap,
        reducer: {
          onLoaded: (data) => {
            if (data.context.page !== 1) {
              return addOrReplaceEntityIn(data, {
                target: 'outOfContextEntities',
              });
            }
            return addOrReplaceEntityIn(data, {
              target: 'entities',
            });
          },
        },
      }),
      delete: action<MyDataListStoreType>()({
        src: () => this.deleteItem$,
        query: ({ actionSrc }) => this.dataListService.deleteItem(actionSrc.id),
        operator: exhaustMap,
        reducer: {
          onLoaded: (data) => {
            return updateEntity(data, ({ entity, status }) => ({
              entity: {
                ...entity,
                ui: {
                  ...entity.ui,
                  disappearIn$: this.remainingTimeBeforeDisappear$(),
                },
              },
              status: {
                ...status,
                delete: {
                  isLoading: false,
                  isLoaded: true,
                  hasError: false,
                  error: null,
                },
              },
            }));
          },
        },
        delayedReducer: [
          {
            notifier: () =>
              race(
                this.pagination$.pipe(skip(1)),
                timer(this.DISAPPEAR_TIMEOUT)
              ),
            reducer: {
              onLoaded: (data) => {
                return removedEntity(data);
              },
            },
          },
        ],
      }),
    }),
    withBulkActions<MyDataListStoreType>()({
      bulkUpdate: bulkAction<MyDataListStoreType>()({
        src: () => this.bulkUpdate$,
        query: ({ actionSrc }) => {
          return this.dataListService.bulkUpdate(actionSrc);
        },
        operator: concatMap,
        optimisticEntities: ({ actionSrc }) => actionSrc.entities,
      }),
      bulkDelete: bulkAction<MyDataListStoreType>()({
        src: () => this.bulkDelete$,
        query: ({ actionSrc }) => {
          return this.dataListService.bulkDelete(actionSrc);
        },
        operator: concatMap,
        reducer: {
          onLoaded: (data) => {
            const result = updateBulkEntities(data, ({ entity, status }) => ({
              entity: {
                ...entity,
                ui: {
                  ...entity.ui,
                  disappearIn$: this.remainingTimeBeforeDisappear$(),
                },
              },
              status: {
                ...status,
                bulkDelete: {
                  isLoading: false,
                  isLoaded: true,
                  hasError: false,
                  error: null,
                },
              },
            }));
            return result;
          },
        },
        delayedReducer: [
          {
            notifier: () =>
              race(
                this.pagination$.pipe(skip(1)),
                timer(this.DISAPPEAR_TIMEOUT)
              ),
            reducer: {
              onLoaded: (data) => {
                return removedBulkEntities(data);
              },
            },
          },
        ],
      }),
    }),
    withSelectors<MyDataListStoreType>()({
      entityLevel: ({ status }) => {
        return {
          isProcessing: hasStatus({
            status,
            state: 'isLoading',
          }),
          hasError: hasStatus({ status, state: 'hasError' }),
          errors: extractAllErrors(status),
        };
      },
      storeLevel: ({ entities, outOfContextEntities }) => {
        const allEntities = [...entities, ...outOfContextEntities];
        return {
          hasProcessingItem: entities.some((entity) =>
            hasProcessingItem(entity)
          ),
          totalProcessingItems: totalProcessingItems(allEntities),
          totalUpdatedItems:
            countEntitiesWithStatusByAction({
              entities: allEntities,
              actionName: 'update',
              state: 'isLoaded',
            }) +
            countEntitiesWithStatusByAction({
              entities: allEntities,
              actionName: 'bulkUpdate',
              state: 'isLoaded',
            }),
        };
      },
    })
  );

  constructor() {
    this.dataList.data$.pipe(takeUntilDestroyed()).subscribe((data) => {
      console.log('dataList', data.result.selectors);
    });
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
      entity: {
        ...item,
        name: 'Item ' + Math.floor(Math.random() * (1000 - 100 + 1) + 100),
      },
      status: 'success',
    });
  }
  updateItemError(item: DataItem) {
    this.updateItem$.next({
      entity: {
        ...item,
        name: 'Item ' + Math.floor(Math.random() * (1000 - 100 + 1) + 100),
      },
      status: 'error',
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

  protected bulkUpdate() {
    this.bulkUpdate$.next({
      entities: this.selectedEntities$.value,
      statusRequest: 'success',
    });
    this.resetSelectedEntities();
  }

  protected bulkRemove() {
    this.bulkDelete$.next(this.selectedEntities$.value);
    this.resetSelectedEntities();
  }
  protected toggleSelect(item: DataItem) {
    const selectedEntities = this.selectedEntities$.value;
    const selectedItem = selectedEntities.find(
      (selectedItem) => selectedItem.id === item.id
    );
    if (selectedItem) {
      this.selectedEntities$.next(
        selectedEntities.filter((selectedItem) => selectedItem.id !== item.id)
      );
    }
    this.selectedEntities$.next([item, ...selectedEntities]);
  }

  protected resetSelectedEntities() {
    this.selectedEntities$.next([]);
  }

  protected isSelected(selectedEntities: DataItem[], item: DataItem) {
    // todo improve that, maybe add a isSelected from the selectors
    return selectedEntities.some((selectedItem) => selectedItem.id === item.id);
  }

  protected selectAll(entities: DataItem[] | undefined) {
    this.selectedEntities$.next(entities ?? []);
  }

  private remainingTimeBeforeDisappear$() {
    const deletionTime = new Date(Date.now() + this.DISAPPEAR_TIMEOUT);
    const remainingTime$ = interval(1000).pipe(
      startWith(0), // Emit immediately
      map(() =>
        Math.max(0, Math.ceil((deletionTime.getTime() - Date.now()) / 1000))
      ), // Convert ms to seconds
      takeWhile((remainingTime) => remainingTime > 0, true), // Emit until time reaches 0
      map(
        (remainingTime) => `Remaining time before disappear: ${remainingTime}s`
      )
    );
    return remainingTime$;
  }
}
