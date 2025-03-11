import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of, delay, map } from 'rxjs';

export interface DataItem {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class DataListService {
  private dataList = [
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
  ].reverse();

  getDataList$(data: {
    page: number;
    pageSize: number;
  }): Observable<DataItem[]> {
    return of(
      this.dataList.slice(
        (data.page - 1) * data.pageSize,
        data.page * data.pageSize
      )
    ).pipe(delay(2000));
  }

  addItem(newItem: Omit<DataItem, 'id'>) {
    // add a radom number and return a random number
    return of({
      id: Math.floor(Math.random() * 1000),
      name: newItem.name,
    }).pipe(delay(5000));
  }

  deleteItem(item: DataItem) {
    return of(item).pipe(delay(2000));
  }

  updateItem(updatedItem: DataItem) {
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
