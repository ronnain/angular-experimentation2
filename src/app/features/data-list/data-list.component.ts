import { Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DataItem, DataListService } from './data-list.service';
import { CommonModule } from '@angular/common';
import {
  BehaviorSubject,
  exhaustMap,
  interval,
  Subject,
  switchMap,
  tap,
  timer,
} from 'rxjs';
import { Store } from './store';
import { Store2 } from './storev2';

@Component({
  selector: 'app-data-list',
  templateUrl: './data-list.component.html',
  styleUrls: ['./data-list.component.css'],
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
})
export class DataListComponent {
  private dataListService = inject(DataListService);

  createItem$ = new Subject<DataItem>();
  updateItem$ = new Subject<DataItem>();
  deleteItem$ = new Subject<DataItem>();
  getAllData$ = new BehaviorSubject<{
    page: number;
    pageSize: number;
  }>({
    page: 1,
    pageSize: 3,
  });

  protected readonly store2 = inject(Store2)({
    getEntities: {
      srcContext: this.getAllData$,
      api: (srcContext) => this.dataListService.getDataList$(srcContext),
      initialData: [],
      preservePreviousEntitiesWhenSrcContextEmit: true,
    },
    entityIdSelector: (item) => item.id,
    entityLevelAction: {
      update: {
        src: () => this.updateItem$,
        api: (item) => this.dataListService.updateItem(item),
        operator: switchMap,
      },
      create: {
        src: () => this.createItem$,
        api: (item) => this.dataListService.addItem(item),
        operator: switchMap,
        customIdSelector: (item) => item.name,
        reducer: {
          onLoaded: ({
            context,
            entityWithStatus,
            entities,
            outOfContextEntities,
            customIdSelector,
          }) => {
            // todo create helper function
            // todo improve
            // @ts-ignore
            if (context.page !== 1) {
              return {
                entities: entities,
                outOfContextEntities: [
                  entityWithStatus,
                  ...outOfContextEntities,
                ],
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
                    customIdSelector(entityWithStatus.entity) !==
                    customIdSelector(entityWithStatus.entity)
                  );
                }
              ),
            };
          },
        },
      },
      delete: {
        src: () => this.deleteItem$,
        api: (item) => this.dataListService.deleteItem(item),
        operator: exhaustMap,
        delayedReducer: [
          {
            notifier: () => timer(2000),
            reducer: {
              onLoaded: ({
                entityWithStatus,
                entities,
                outOfContextEntities,
                customIdSelector,
              }) => {
                return {
                  entities: entities?.filter(
                    (entityData) =>
                      !entityData.entity ||
                      customIdSelector(entityData.entity) !=
                        entityWithStatus?.id
                  ),
                  outOfContextEntities: outOfContextEntities?.filter(
                    (entityData) =>
                      !entityData.entity ||
                      customIdSelector(entityData.entity) !=
                        entityWithStatus?.id
                  ),
                };
              },
            },
          },
        ],
      },
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

  updateItemTest(id: number) {
    this.updateItem$.next({
      id,
      name:
        'Item 1 TEST UPDATE' +
        Math.floor(Math.random() * (1000 - 100 + 1) + 100),
    });
  }
  updateItemError(id: number) {
    this.updateItem$.next({
      id,
      name: 'error',
    });
  }

  deleteItemTest(id: number) {
    this.deleteItem$.next({ id, name: 'Item 1' });
  }

  createItemTest() {
    const id = Math.floor(Math.random() * 1000);
    const newItemWithId = {
      id,
      name: 'Created Item ' + ' - ' + id,
    };
    this.createItem$.next(newItemWithId);
  }
}
