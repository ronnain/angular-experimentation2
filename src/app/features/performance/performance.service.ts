import { Injectable } from '@angular/core';
import {
  Observable,
  BehaviorSubject,
  of,
  delay,
  map,
  take,
  timer,
  interval,
  startWith,
} from 'rxjs';

export type PerformanceItem = {
  id: string;
  name: string;
  counter1: number;
  counter2: number;
  counter3: number; // Added counter3
};

@Injectable({
  providedIn: 'root',
})
export class PerformanceService {
  private basicDataList$ = new BehaviorSubject<PerformanceItem[]>(
    [
      { id: '1', name: 'Item 1', counter1: 0, counter2: 0, counter3: 0 },
      { id: '2', name: 'Item 2', counter1: 0, counter2: 0, counter3: 0 },
      { id: '3', name: 'Item 3', counter1: 0, counter2: 0, counter3: 0 },
      { id: '4', name: 'Item 4', counter1: 0, counter2: 0, counter3: 0 },
      { id: '5', name: 'Item 5', counter1: 0, counter2: 0, counter3: 0 },
      { id: '6', name: 'Item 6', counter1: 0, counter2: 0, counter3: 0 },
      { id: '7', name: 'Item 7', counter1: 0, counter2: 0, counter3: 0 },
      { id: '8', name: 'Item 8', counter1: 0, counter2: 0, counter3: 0 },
      { id: '9', name: 'Item 9', counter1: 0, counter2: 0, counter3: 0 },
      { id: '10', name: 'Item 10', counter1: 0, counter2: 0, counter3: 0 },
      // { id: '11', name: 'Item 11', counter1: 0, counter2: 0 },
      // { id: '12', name: 'Item 12', counter1: 0, counter2: 0 },
      // { id: '13', name: 'Item 13', counter1: 0, counter2: 0 },
      // { id: '14', name: 'Item 14', counter1: 0, counter2: 0 },
      // { id: '15', name: 'Item 15', counter1: 0, counter2: 0 },
      // { id: '16', name: 'Item 16', counter1: 0, counter2: 0 },
      // { id: '17', name: 'Item 17', counter1: 0, counter2: 0 },
      // { id: '18', name: 'Item 18', counter1: 0, counter2: 0 },
      // { id: '19', name: 'Item 19', counter1: 0, counter2: 0 },
      // { id: '20', name: 'Item 20', counter1: 0, counter2: 0 },
      // { id: '21', name: 'Item 21', counter1: 0, counter2: 0 },
      // { id: '22', name: 'Item 22', counter1: 0, counter2: 0 },
      // { id: '23', name: 'Item 23', counter1: 0, counter2: 0 },
      // { id: '24', name: 'Item 24', counter1: 0, counter2: 0 },
      // { id: '25', name: 'Item 25', counter1: 0, counter2: 0 },
      // { id: '26', name: 'Item 26', counter1: 0, counter2: 0 },
      // { id: '27', name: 'Item 27', counter1: 0, counter2: 0 },
      // { id: '28', name: 'Item 28', counter1: 0, counter2: 0 },
      // { id: '29', name: 'Item 29', counter1: 0, counter2: 0 },
      // { id: '30', name: 'Item 30', counter1: 0, counter2: 0 },
      // { id: '31', name: 'Item 31', counter1: 0, counter2: 0 },
      // { id: '32', name: 'Item 32', counter1: 0, counter2: 0 },
      // { id: '33', name: 'Item 33', counter1: 0, counter2: 0 },
      // { id: '34', name: 'Item 34', counter1: 0, counter2: 0 },
      // { id: '35', name: 'Item 35', counter1: 0, counter2: 0 },
      // { id: '36', name: 'Item 36', counter1: 0, counter2: 0 },
      // { id: '37', name: 'Item 37', counter1: 0, counter2: 0 },
      // { id: '38', name: 'Item 38', counter1: 0, counter2: 0 },
      // { id: '39', name: 'Item 39', counter1: 0, counter2: 0 },
      // { id: '40', name: 'Item 40', counter1: 0, counter2: 0 },
      // { id: '41', name: 'Item 41', counter1: 0, counter2: 0 },
      // { id: '42', name: 'Item 42', counter1: 0, counter2: 0 },
      // { id: '43', name: 'Item 43', counter1: 0, counter2: 0 },
      // { id: '44', name: 'Item 44', counter1: 0, counter2: 0 },
      // { id: '45', name: 'Item 45', counter1: 0, counter2: 0 },
      // { id: '46', name: 'Item 46', counter1: 0, counter2: 0 },
      // { id: '47', name: 'Item 47', counter1: 0, counter2: 0 },
      // { id: '48', name: 'Item 48', counter1: 0, counter2: 0 },
      // { id: '49', name: 'Item 49', counter1: 0, counter2: 0 },
      // { id: '50', name: 'Item 50', counter1: 0, counter2: 0 },
      // { id: '51', name: 'Item 51', counter1: 0, counter2: 0 },
      // { id: '52', name: 'Item 52', counter1: 0, counter2: 0 },
      // { id: '53', name: 'Item 53', counter1: 0, counter2: 0 },
      // { id: '54', name: 'Item 54', counter1: 0, counter2: 0 },
      // { id: '55', name: 'Item 55', counter1: 0, counter2: 0 },
      // { id: '56', name: 'Item 56', counter1: 0, counter2: 0 },
      // { id: '57', name: 'Item 57', counter1: 0, counter2: 0 },
      // { id: '58', name: 'Item 58', counter1: 0, counter2: 0 },
      // { id: '59', name: 'Item 59', counter1: 0, counter2: 0 },
      // { id: '60', name: 'Item 60', counter1: 0, counter2: 0 },
      // { id: '61', name: 'Item 61', counter1: 0, counter2: 0 },
      // { id: '62', name: 'Item 62', counter1: 0, counter2: 0 },
      // { id: '63', name: 'Item 63', counter1: 0, counter2: 0 },
      // { id: '64', name: 'Item 64', counter1: 0, counter2: 0 },
      // { id: '65', name: 'Item 65', counter1: 0, counter2: 0 },
      // { id: '66', name: 'Item 66', counter1: 0, counter2: 0 },
      // { id: '67', name: 'Item 67', counter1: 0, counter2: 0 },
      // { id: '68', name: 'Item 68', counter1: 0, counter2: 0 },
      // { id: '69', name: 'Item 69', counter1: 0, counter2: 0 },
      // { id: '70', name: 'Item 70', counter1: 0, counter2: 0 },
      // { id: '71', name: 'Item 71', counter1: 0, counter2: 0 },
    ].reverse()
  );

  public readonly itemUpdatedCounter1$ = interval(1).pipe(
    startWith(0),
    map((i) => {
      const randomIndex = i % 10;
      const randomItem = this.basicDataList$.value[randomIndex];
      const updatedItem = {
        ...randomItem,
        counter1: Math.floor(i / 10) + 1,
      };
      return updatedItem;
    })
  );
  public readonly itemUpdatedCounter2$ = interval(1).pipe(
    startWith(0),
    map((i) => {
      const randomIndex = i % 10;
      const randomItem = this.basicDataList$.value[randomIndex];
      const updatedItem = {
        ...randomItem,
        counter2: Math.floor(i / 10) + 1,
      };
      return updatedItem;
    })
  );
  public readonly itemUpdatedCounter3$ = interval(1).pipe(
    startWith(0),
    map((i) => {
      const randomIndex = i % 10;
      const randomItem = this.basicDataList$.value[randomIndex];
      const updatedItem = {
        ...randomItem,
        counter3: Math.floor(i / 10) + 1, // Update counter3
      };
      return updatedItem;
    })
  );

  constructor() {}

  getBasicDataList$(): Observable<PerformanceItem[]> {
    return this.basicDataList$.pipe(take(1));
  }
}
