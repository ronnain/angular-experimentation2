import { Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DataItem, DataListService } from './data-list.service';
import { CommonModule } from '@angular/common';
import {
  BehaviorSubject,
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
  removedEntity,
  totalProcessingItems,
  updateEntity,
} from './store-helper';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  action,
  DataListStoreType,
  store,
  withActions,
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
  private readonly bulkUpdate$ = new Subject<DataItem[]>();
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
        query: ({ data }) => {
          return this.dataListService.updateItem(data);
        },
        operator: switchMap,
      }),
      create: action<MyDataListStoreType>()({
        src: () => this.createItem$,
        query: ({ data }) => this.dataListService.addItem(data),
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
        query: ({ data }) => this.dataListService.deleteItem(data.id),
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
            }) + 0,
          // countEntitiesWithStatusByAction({
          //   entities: allEntities,
          //   actionName: 'bulkUpdate',
          //   state: 'isLoaded',
          // }),
        };
      },
    })
  );

  // protected readonly dataList = inject(DataListStore)<
  //   DataItem,
  //   Pagination,
  //   ActionsName
  // >()({
  //   entitiesSrc: entitiesSource<DataItem, ActionsName>()({
  //     srcContext: this.pagination$,
  //     query: (srcContext) => this.dataListService.getDataList$(srcContext),
  //     initialData: [],
  //   }),
  //   entityIdSelector: (item) => item.id ?? item.optimisticId,
  //   entityLevelAction: {
  //     update: entityLevelAction<DataItem>()({
  //       src: () => this.updateItem$,
  //       optimisticEntity: (actionSrc) => actionSrc.entity,
  //       api: ({ data }) => {
  //         return this.dataListService.updateItem(data);
  //       },
  //       operator: switchMap,
  //     }),
  //     create: entityLevelAction<DataItem>()({
  //       src: () => this.createItem$,
  //       api: ({ data }) => this.dataListService.addItem(data),
  //       operator: switchMap,
  //     }),
  //     delete: entityLevelAction<DataItem>()({
  //       src: () => this.deleteItem$,
  //       api: ({ data }) => this.dataListService.deleteItem(data.id),
  //       operator: exhaustMap,
  //     }),
  //   },
  //   reducer: {
  //     create: {
  //       onLoaded: (data) => {
  //         if (data.context.page !== 1) {
  //           return addOrReplaceEntityIn(data, {
  //             target: 'outOfContextEntities',
  //           });
  //         }
  //         return addOrReplaceEntityIn(data, {
  //           target: 'entities',
  //         });
  //       },
  //     },
  //     delete: {
  //       onLoaded: (data) => {
  //         return updateEntity(data, ({ entity, status }) => ({
  //           entity: {
  //             ...entity,
  //             ui: {
  //               ...entity.ui,
  //               disappearIn$: this.remainingTimeBeforeDisappear$(),
  //             },
  //           },
  //           status: {
  //             ...status,
  //             delete: {
  //               isLoading: false,
  //               isLoaded: true,
  //               hasError: false,
  //               error: null,
  //             },
  //           },
  //         }));
  //       },
  //     },
  //   },
  //   delayedReducer: {
  //     delete: [
  //       {
  //         notifier: () =>
  //           race(this.pagination$.pipe(skip(1)), timer(this.DISAPPEAR_TIMEOUT)),
  //         reducer: {
  //           onLoaded: (data) => {
  //             return removedEntity(data);
  //           },
  //         },
  //       },
  //     ],
  //   },
  //   bulkActions: {
  //     bulkUpdate: bulkAction({
  //       src: () => this.bulkUpdate$,
  //       api: ({ data }) => {
  //         return this.dataListService.bulkUpdate(data);
  //       },
  //       operator: concatMap,
  //     }),
  //     bulkDelete: bulkAction({
  //       src: () => this.bulkDelete$,
  //       api: ({ data }) => {
  //         return this.dataListService.bulkDelete(data);
  //       },
  //       operator: concatMap,
  //     }),
  //   },
  //   bulkReducer: {
  //     bulkDelete: {
  //       onLoaded: (data) => {
  //         const result = updateBulkEntities(data, ({ entity, status }) => ({
  //           entity: {
  //             ...entity,
  //             ui: {
  //               ...entity.ui,
  //               disappearIn$: this.remainingTimeBeforeDisappear$(),
  //             },
  //           },
  //           status: {
  //             ...status,
  //             bulkDelete: {
  //               isLoading: false,
  //               isLoaded: true,
  //               hasError: false,
  //               error: null,
  //             },
  //           },
  //         }));
  //         return result;
  //       },
  //     },
  //   },
  //   bulkDelayedReducer: {
  //     bulkDelete: [
  //       {
  //         notifier: () =>
  //           race(this.pagination$.pipe(skip(1)), timer(this.DISAPPEAR_TIMEOUT)),
  //         reducer: {
  //           onLoaded: (data) => {
  //             return removedBulkEntities(data);
  //           },
  //         },
  //       },
  //     ],
  //   },
  //   selectors: {
  //     entityLevel: ({ status }) => {
  //       return {
  //         isProcessing: hasStatus({ status, state: 'isLoading' }),
  //         hasError: hasStatus({ status, state: 'hasError' }),
  //         errors: extractAllErrors(status),
  //       };
  //     },
  //     storeLevel: ({ entities, outOfContextEntities }) => {
  //       const allEntities = [...entities, ...outOfContextEntities];
  //       return {
  //         hasProcessingItem: entities.some((entity) =>
  //           hasProcessingItem(entity)
  //         ),
  //         totalProcessingItems: totalProcessingItems(allEntities),
  //         totalUpdatedItems:
  //           countEntitiesWithStatusByAction({
  //             entities: allEntities,
  //             actionName: 'update',
  //             state: 'isLoaded',
  //           }) +
  //           countEntitiesWithStatusByAction({
  //             entities: allEntities,
  //             actionName: 'bulkUpdate',
  //             state: 'isLoaded',
  //           }),
  //       };
  //     },
  //   },
  // });

  constructor() {
    this.dataList.data$.pipe(takeUntilDestroyed()).subscribe((data) => {
      console.log('dataList', data.result);
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
