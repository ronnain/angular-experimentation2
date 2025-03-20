import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of, delay, map, take, timer } from 'rxjs';

export type DataItem =
  | {
      id: string;
      name: string;
    }
  | { id: undefined; name: string; optimisticId: string };

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
      throw new Error('Item not found');
    }
    this.dataList$.next(
      this.dataList$.value.filter((dataItem) => dataItem.id !== itemId)
    );
    return of(deletedItem).pipe(delay(2000));
  }

  updateItem(updatedItem: DataItem) {
    this.dataList$.next(
      this.dataList$.value.map((dataItem) =>
        dataItem.id === updatedItem.id ? updatedItem : dataItem
      )
    );
    return of(updatedItem).pipe(delay(2000));
  }
}
