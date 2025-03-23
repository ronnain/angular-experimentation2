import { Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DataItem, DataListService } from './data-list.service';
import { CommonModule } from '@angular/common';
import {
  BehaviorSubject,
  concatMap,
  exhaustMap,
  mergeMap,
  Observable,
  Subject,
  switchMap,
  timer,
} from 'rxjs';
import { bulkAction, entityLevelAction, Store2 } from './storev2';
import { addOrReplaceEntityIn, removedEntity } from './store-helper';

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

  createItem$ = new Subject<DataItem>();
  updateItem$ = new Subject<DataItem & { updateInfo: 'error' | 'success' }>();
  deleteItem$ = new Subject<DataItem>();
  getAllData$ = new BehaviorSubject<Pagination>({
    page: 1,
    pageSize: 20,
  });

  protected readonly selectedEntities$ = new BehaviorSubject<DataItem[]>([]);

  private readonly bulkUpdate$ = new Subject<DataItem[]>();
  private readonly bulkRemove$ = new Subject<DataItem[]>();

  protected readonly store2 = inject(Store2)({
    getEntities: {
      srcContext: this.getAllData$,
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
      bulkRemove: bulkAction({
        src: () => this.bulkRemove$,
        api: ({ data }) => {
          return this.dataListService.bulkUpdate(data);
        },
        operator: concatMap,
      }),
    } as const,
    // bulkReducer: {
    //   // todo remove this
    //   bulkUpdate: {
    //     onLoaded: ({
    //       bulkEntities,
    //       context,
    //       entities,
    //       outOfContextEntities,
    //     }) => {
    //       return {
    //         entities,
    //         outOfContextEntities,
    //       };
    //     },
    //   },
    // },
    selectors: {
      entityLevel: ({ status }) => {
        const hasError = Object.values(status).some(
          (entityStatus) => entityStatus?.hasError
        );
        return {
          isProcessing: Object.values(status).some(
            (entityStatus) => entityStatus?.isLoading
          ),
          hasError,
          errors: Object.entries(status)
            .filter(([, entityStatus]) => entityStatus.hasError)
            .map(([status, statusWithError]) => {
              return {
                status,
                message: statusWithError.error.message,
              };
            }),
        };
      },
      storeLevel: ({ entities, outOfContextEntities }) => ({
        hasProcessingItem: entities.some((entity) =>
          Object.values(entity.status).some(
            (entityStatus) => entityStatus?.isLoading
          )
        ),
        totalProcessingItems: [...entities, ...outOfContextEntities].reduce(
          (acc, entity) =>
            acc +
            Object.values(entity.status).filter(
              (entityStatus) => entityStatus?.isLoading
            ).length,
          0
        ),
        totalDeletedItems: [...entities, ...outOfContextEntities].reduce(
          (acc, entity) => acc + (entity.status.delete?.isLoaded ? 1 : 0),

          0
        ),
        totalUpdatedItems: [...entities, ...outOfContextEntities].reduce(
          (acc, entity) => acc + (entity.status.update?.isLoaded ? 1 : 0),
          0
        ),
        totalCreatedItems: [...entities, ...outOfContextEntities].reduce(
          (acc, entity) => acc + (entity.status.create?.isLoaded ? 1 : 0),
          0
        ),
        // todo get errors ?
      }),
    },
  });

  previousPage() {
    const currentPage = this.getAllData$.value.page;
    if (currentPage > 1) {
      this.getAllData$.next({
        ...this.getAllData$.value,
        page: currentPage - 1,
      });
    }
  }

  nextPage() {
    const currentPage = this.getAllData$.value.page;
    this.getAllData$.next({
      ...this.getAllData$.value,
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
    this.bulkRemove$.next(this.selectedEntities$.value);
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
}
