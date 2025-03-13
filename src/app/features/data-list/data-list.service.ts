import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of, delay, map, take } from 'rxjs';

export interface DataItem {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class DataListService {
  private dataList$ = new BehaviorSubject(
    [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
      { id: 3, name: 'Item 3' },
      { id: 4, name: 'Item 4' },
      { id: 5, name: 'Item 5' },
      { id: 6, name: 'Item 6' },
      { id: 7, name: 'Item 7' },
      { id: 8, name: 'Item 8' },
      { id: 9, name: 'Item 9' },
      { id: 10, name: 'Item 10' },
    ].reverse()
  );

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

  addItem(newItem: Omit<DataItem, 'id'>) {
    // add a radom number and return a random number
    const newItemWithId = {
      id: Math.floor(Math.random() * 1000),
      name: newItem.name,
    };
    this.dataList$.next([newItemWithId, ...this.dataList$.value]);
    return of(newItemWithId).pipe(delay(5000));
  }

  deleteItem(item: DataItem) {
    this.dataList$.next(
      this.dataList$.value.filter((dataItem) => dataItem.id !== item.id)
    );
    return of(item).pipe(delay(2000));
  }

  updateItem(updatedItem: DataItem) {
    this.dataList$.next(
      this.dataList$.value.map((dataItem) =>
        dataItem.id === updatedItem.id ? updatedItem : dataItem
      )
    );
    if (updatedItem.name === 'error') {
      return of(updatedItem).pipe(
        delay(2000),
        map(() => {
          throw new Error('Error updating item');
        })
      );
    }
    return of(updatedItem).pipe(delay(2000));
  }
}
