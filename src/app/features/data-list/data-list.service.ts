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
  private dataListSubject = new BehaviorSubject<DataItem[]>([
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' },
  ]);

  getDataList$(): Observable<DataItem[]> {
    return this.dataListSubject.asObservable().pipe(delay(2000));
  }

  addItem(newItem: Omit<DataItem, 'id'>) {
    // add a radom number and return a random number
    return of({
      id: Math.floor(Math.random() * 1000),
      name: newItem.name,
    }).pipe(delay(2000));
    // this.dataListSubject.next([...currentDataList, newItem]);
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
