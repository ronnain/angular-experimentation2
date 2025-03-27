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
  tap,
  timer,
} from 'rxjs';
import {
  bulkAction,
  BulkReducerParams,
  entityLevelAction,
  EntityWithStatus,
  Store2,
} from './storev2';
import {
  addOrReplaceEntityIn,
  countEntitiesWithStatusByAction,
  extractAllErrors,
  hasProcessingItem,
  hasStatus,
  isStatusProcessing,
  removedEntities,
  removedEntity,
  totalProcessingItems,
  updateEntities,
  updateEntity,
} from './store-helper';

type Pagination = {
  page: number;
  pageSize: number;
};

@Component({
  selector: 'app-data-list',
  templateUrl: './data-list.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
})
export class DataListComponent {
  private dataListService = inject(DataListService);

  private readonly DISAPPEAR_TIMEOUT = 10000;

  // sources
  private readonly pagination$ = new BehaviorSubject<Pagination>({
    page: 1,
    pageSize: 8,
  });
  // sources actions
  private readonly createItem$ = new Subject<DataItem>();
  private readonly updateItem$ = new Subject<
    DataItem & { updateInfo: 'error' | 'success' }
  >();
  private readonly deleteItem$ = new Subject<DataItem>();
  private readonly bulkUpdate$ = new Subject<DataItem[]>();
  private readonly bulkDelete$ = new Subject<DataItem[]>();

  protected readonly selectedEntities$ = new BehaviorSubject<DataItem[]>([]);

  protected readonly store2 = inject(Store2)({
    getEntities: {
      srcContext: this.pagination$,
      api: (srcContext) => this.dataListService.getDataList$(srcContext),
      initialData: [],
    },
    entityIdSelector: (item) => item.id ?? item.optimisticId,
    entityLevelAction: {
      update: entityLevelAction({
        src: () => this.updateItem$,
        api: ({ data }) => {
          return this.dataListService.updateItem(data);
        },
        operator: switchMap,
      }),
      create: entityLevelAction({
        src: () => this.createItem$,
        api: ({ data }) => this.dataListService.addItem(data),
        operator: switchMap,
      }),
      delete: entityLevelAction({
        src: () => this.deleteItem$,
        api: ({ data }) => this.dataListService.deleteItem(data.id),
        operator: exhaustMap,
      }),
    } as const,
    reducer: {
      create: {
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
    },
    delayedReducer: {
      delete: [
        {
          notifier: () => timer(2000),
          reducer: {
            onLoaded: (data) => {
              return removedEntity(data);
            },
          },
        },
      ],
    },
    bulkActions: {
      bulkUpdate: bulkAction({
        src: () => this.bulkUpdate$,
        api: ({ data }) => {
          return this.dataListService.bulkUpdate(data);
        },
        operator: concatMap,
      }),
      bulkDelete: bulkAction({
        src: () => this.bulkDelete$,
        api: ({ data }) => {
          return this.dataListService.bulkDelete(data);
        },
        operator: concatMap,
      }),
    } as const,
    bulkReducer: {
      bulkDelete: {
        onLoaded: (data) => {
          const result = updateEntities(data, ({ entity, status }) => ({
            entity: {
              ...entity,
              ui: {
                ...entity.ui,
                hidingIn$: this.remainingTimeBeforeHiding$(),
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
    },
    bulkDelayedReducer: {
      bulkDelete: [
        {
          notifier: () =>
            race(this.pagination$.pipe(skip(1)), timer(this.DISAPPEAR_TIMEOUT)),
          reducer: {
            onLoaded: (data) => {
              return removedEntities(data);
            },
          },
        },
      ],
    },
    selectors: {
      entityLevel: ({ status }) => {
        return {
          isProcessing: hasStatus({ status, state: 'isLoading' }),
          hasError: hasStatus({ status, state: 'hasError' }),
          errors: extractAllErrors(status),
        };
      },
      storeLevel: ({ entities, outOfContextEntities }) => {
        console.log('entities', entities);
        const allEntities = [...entities, ...outOfContextEntities];
        return {
          hasProcessingItem: entities.some((entity) =>
            hasProcessingItem(entity)
          ),
          totalProcessingItems: totalProcessingItems(allEntities),
          totalDeletedItems: countEntitiesWithStatusByAction({
            entities: allEntities,
            actionName: 'delete',
            state: 'isLoaded',
          }),
          totalUpdatedItems: countEntitiesWithStatusByAction({
            entities: allEntities,
            actionName: 'update',
            state: 'isLoaded',
          }),
          totalCreatedItems: countEntitiesWithStatusByAction({
            entities: allEntities,
            actionName: 'create',
            state: 'isLoaded',
          }),
        };
      },
    },
  });

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

  protected bulkUpdate() {
    this.bulkUpdate$.next(this.selectedEntities$.value);
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

  private remainingTimeBeforeHiding$() {
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
