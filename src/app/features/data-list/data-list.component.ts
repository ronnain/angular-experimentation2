import { Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DataItem, DataListService } from './data-list.service';
import { CommonModule } from '@angular/common';
import {
  BehaviorSubject,
  exhaustMap,
  Observable,
  of,
  Subject,
  switchMap,
  timer,
} from 'rxjs';
import {
  createMyFunctionValue,
  entityLevelAction,
  entityLevelAction,
  Reducer,
  ReducerParams,
  Store2,
} from './storev2';

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
  updateItem$ = new Subject<DataItem & { idTest: number }>();
  deleteItem$ = new Subject<DataItem>();
  getAllData$ = new BehaviorSubject<Pagination>({
    page: 1,
    pageSize: 3,
  });

  private a = {
    test: createMyFunctionValue({
      src: () => of({ id: 1 }),
      api: (params) => {
        const test = params.data; // Now correctly inferred as number
        return new Observable<string>();
      },
      operator: switchMap,
    }),
  };

  protected readonly store2 = inject(Store2)({
    getEntities: {
      srcContext: this.getAllData$,
      api: (srcContext) => this.dataListService.getDataList$(srcContext),
      initialData: [],
      preservePreviousEntitiesWhenSrcContextEmit: true,
    },
    entityIdSelector: (item) => item.id,
    entityLevelAction: {
      update: entityLevelAction<Pagination>()({
        src: () => this.updateItem$,
        api: ({ data }) => {
          return this.dataListService.updateItem(data);
        },
        operator: switchMap,
      }),
      create: entityLevelAction<Pagination>()({
        src: () => this.createItem$,
        api: ({ data }: { data: DataItem }) =>
          this.dataListService.addItem(data),
        operator: switchMap,
        customIdSelector: (item: DataItem) => item.name,
        reducer: {
          onLoaded: ({
            context,
            entityWithStatus,
            entities,
            outOfContextEntities,
            customIdSelector,
          }) => {
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
      }),
      delete: entityLevelAction<Pagination>()({
        src: () => this.deleteItem$,
        api: ({ data }: { data: DataItem }) =>
          this.dataListService.deleteItem(data),
        operator: exhaustMap,
        delayedReducer: [
          {
            notifier: () => timer(2000),
            reducer: {
              // onLoaded: ({
              //   entityWithStatus,
              //   entities,
              //   outOfContextEntities,
              //   customIdSelector,
              // }: ReducerParams<DataItem, Pagination>) => {
              //   return {
              //     entities: entities?.filter(
              //       (entityData) =>
              //         !entityData.entity ||
              //         customIdSelector(entityData.entity) !=
              //           entityWithStatus?.id
              //     ),
              //     outOfContextEntities: outOfContextEntities?.filter(
              //       (entityData) =>
              //         !entityData.entity ||
              //         customIdSelector(entityData.entity) !=
              //           entityWithStatus?.id
              //     ),
              //   };
              // },
            },
          },
        ],
      }),
    } as const,
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
