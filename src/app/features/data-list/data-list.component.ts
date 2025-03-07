import { Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DataItem, DataListService } from './data-list.service';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, interval, Subject, switchMap } from 'rxjs';
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
  getAllData$ = new BehaviorSubject<void>(undefined);

  store = inject(Store)({
    create: {
      api: (item) => this.dataListService.addItem(item as DataItem),
      src: () => this.createItem$,
    },
    update: {
      api: (item) => this.dataListService.updateItem(item),
      src: () => this.updateItem$,
      operator: switchMap,
    },
    delete: {
      api: (item) => this.dataListService.deleteItem(item),
      src: () => this.deleteItem$,
      duration: (events) => {
        return interval(2000);
      },
    },
    getAll: {
      api: () => this.dataListService.getDataList$(),
      src: this.getAllData$,
      initialData: [],
    },
  });

  protected readonly store2 = inject(Store2)({
    getEntities: {
      src: this.getAllData$,
      api: () => this.dataListService.getDataList$(),
      initialData: [],
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
          onLoaded: (data) => {
            return {
              entities: data.entityWithStatus
                ? [data.entityWithStatus, ...(data.entities ?? [])]
                : undefined,
              outOfContextEntities: data.outOfContextEntities?.filter(
                (entityWithStatus) => {
                  if (
                    !entityWithStatus.entity ||
                    !data.entityWithStatus?.entity
                  ) {
                    return true;
                  }
                  return (
                    data.customIdSelector(entityWithStatus.entity) !==
                    data.customIdSelector(data.entityWithStatus.entity)
                  );
                }
              ),
            };
          },
        },
      },
    },
  });

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
    const newId = Math.floor(Math.random() * (1000 - 100 + 1) + 100);
    this.createItem$.next({
      id: newId,
      name: 'Created Item ' + newId,
    });
  }
}
