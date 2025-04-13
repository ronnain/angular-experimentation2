import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of, delay, map, take, timer } from 'rxjs';

export type DataItem = {
  name: string;
  ui?: {
    disappearIn$: Observable<string>; // will emit each seconds
  };
} & (
  | {
      id: string;
    }
  | { id: undefined; optimisticId: string }
);

@Injectable({
  providedIn: 'root',
})
export class DataListService {
  private dataList$ = new BehaviorSubject<DataItem[]>(
    [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
      { id: '3', name: 'Item 3' },
      { id: '4', name: 'Item 4' },
      { id: '5', name: 'Item 5' },
      { id: '6', name: 'Item 6' },
      { id: '7', name: 'Item 7' },
      { id: '8', name: 'Item 8' },
      { id: '9', name: 'Item 9' },
      { id: '10', name: 'Item 10' },
      { id: '11', name: 'Item 11' },
      { id: '12', name: 'Item 12' },
      { id: '13', name: 'Item 13' },
      { id: '14', name: 'Item 14' },
      { id: '15', name: 'Item 15' },
      { id: '16', name: 'Item 16' },
      { id: '17', name: 'Item 17' },
      { id: '18', name: 'Item 18' },
      { id: '19', name: 'Item 19' },
      { id: '20', name: 'Item 20' },
    ].reverse()
  );

  constructor() {
    this.dataList$.subscribe((dataList) => console.log(dataList));
  }

  getDataList$(data: {
    page: number;
    pageSize: number;
  }): Observable<DataItem[]> {
    return this.dataList$.pipe(
      take(1),
      map((dataList) =>
        dataList.slice(
          (data.page - 1) * data.pageSize,
          data.page * data.pageSize
        )
      ),
      delay(2000)
    );
  }

  addItem(newItem: DataItem) {
    // add a radom number and return a random number
    this.dataList$.next([newItem, ...this.dataList$.value]);
    return of(newItem).pipe(delay(5000));
  }

  deleteItem(itemId: DataItem['id']) {
    const deletedItem = this.dataList$.value.find(
      (dataItem) => dataItem.id === itemId
    );
    if (!deletedItem) {
      throw new Error('failed to find the deleted item');
    }
    this.dataList$.next(
      this.dataList$.value.filter((dataItem) => dataItem.id !== itemId)
    );
    return of(deletedItem).pipe(delay(2000));
  }

  updateItem({
    entity,
    status,
  }: {
    entity: DataItem;
    status: 'error' | 'success';
  }) {
    if (status === 'error') {
      return timer(2000).pipe(
        map(() => {
          throw new Error(`Error updating item ${entity.name}, please retry`);
        })
      );
    }
    this.dataList$.next(
      this.dataList$.value.map((dataItem) =>
        dataItem.id === entity.id ? entity : dataItem
      )
    );
    return of(entity).pipe(delay(2000));
  }

  getItemById(itemId: DataItem['id']) {
    return this.dataList$.pipe(
      take(1),
      map((dataList) => {
        const item = dataList.find((dataItem) => dataItem.id === itemId);
        if (!item) {
          throw new Error(`failed to find the item ${itemId}`);
        }
        return item;
      }),
      delay(2000)
    );
  }

  bulkUpdate({
    entities,
    statusRequest,
  }: {
    entities: DataItem[];
    statusRequest: 'success' | 'error';
  }) {
    if (statusRequest === 'error') {
      return timer(5000).pipe(
        map(() => {
          throw new Error(
            `Error updating entities: ${entities.map(
              (e) => e.id + '/'
            )}, please retry`
          );
        })
      );
    }
    this.dataList$.next(
      this.dataList$.value.map(
        (dataItem) =>
          entities.find((item) => item.id === dataItem.id) || dataItem
      )
    );
    return of(entities).pipe(delay(5000));
  }

  bulkDelete(data: DataItem[]) {
    this.dataList$.next(
      this.dataList$.value.filter(
        (dataItem) => !data.find((item) => item.id === dataItem.id)
      )
    );
    return of(data).pipe(delay(5000));
  }
}
