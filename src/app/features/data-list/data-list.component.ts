import { Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DataItem, DataListService } from './data-list.service';
import { CommonModule } from '@angular/common';
import {
  BehaviorSubject,
  exhaustMap,
  Observable,
  Subject,
  switchMap,
  timer,
} from 'rxjs';
import { entityLevelAction, EntityLevelActionConfig, Store2 } from './storev2';

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
  getAllData$ = new BehaviorSubject<Pagination>({
    page: 1,
    pageSize: 3,
  });

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
        onLoaded: ({
          context,
          entityWithStatus,
          entities,
          outOfContextEntities,
          entityIdSelector,
        }) => {
          entityWithStatus.status.update;
          if (context.page !== 1) {
            return {
              entities: entities,
              outOfContextEntities: [entityWithStatus, ...outOfContextEntities],
            };
          }
          return {
            entities: [entityWithStatus, ...entities],
            outOfContextEntities: outOfContextEntities.filter(
              (entityWithStatus) => {
                if (!entityWithStatus.entity || !entityWithStatus?.entity) {
                  return true;
                }
                return (
                  entityIdSelector(entityWithStatus.entity) !==
                  entityIdSelector(entityWithStatus.entity)
                );
              }
            ),
          };
        },
      },
    },
    delayedReducer: {
      delete: [
        {
          notifier: () => timer(2000),
          reducer: {
            onLoaded: ({
              entityWithStatus,
              entities,
              outOfContextEntities,
              entityIdSelector,
            }) => {
              return {
                entities: entities?.filter(
                  (entityData) =>
                    !entityData.entity ||
                    entityIdSelector(entityData.entity) != entityWithStatus?.id
                ),
                outOfContextEntities: outOfContextEntities?.filter(
                  (entityData) =>
                    !entityData.entity ||
                    entityIdSelector(entityData.entity) != entityWithStatus?.id
                ),
              };
            },
          },
        },
      ],
    },
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
        // todo for storelevel selectors pass the entityLevelSelectors
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
}
