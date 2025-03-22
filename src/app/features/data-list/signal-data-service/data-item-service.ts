import { DataService } from '@angular-architects/ngrx-toolkit';
import { Injectable } from '@angular/core';
import { SignalDataItem, SignalPagination } from './item-type';
import { EntityId } from '@ngrx/signals/entities';
import {
  BehaviorSubject,
  delay,
  lastValueFrom,
  map,
  of,
  take,
  tap,
} from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SignalDataItemService
  implements DataService<SignalDataItem, SignalPagination>
{
  private dataList$ = new BehaviorSubject<SignalDataItem[]>(
    [
      { id: '1', name: 'Item 1', optimisticId: undefined },
      { id: '2', name: 'Item 2', optimisticId: undefined },
      { id: '3', name: 'Item 3', optimisticId: undefined },
      { id: '4', name: 'Item 4', optimisticId: undefined },
      { id: '5', name: 'Item 5', optimisticId: undefined },
      { id: '6', name: 'Item 6', optimisticId: undefined },
      { id: '7', name: 'Item 7', optimisticId: undefined },
      { id: '8', name: 'Item 8', optimisticId: undefined },
      { id: '9', name: 'Item 9', optimisticId: undefined },
      { id: '10', name: 'Item 10', optimisticId: undefined },
    ].reverse()
  );

  constructor() {}
  load({ page, pageSize }: SignalPagination): Promise<SignalDataItem[]> {
    return lastValueFrom(
      this.dataList$.pipe(
        take(1),
        map((dataList) =>
          dataList.slice((page - 1) * pageSize, page * pageSize)
        ),
        delay(2000)
      )
    );
  }
  loadById(id: EntityId): Promise<SignalDataItem> {
    return lastValueFrom(
      this.dataList$.pipe(
        take(1),
        map(
          (dataList) =>
            dataList.find((dataItem) => dataItem.id === id) as SignalDataItem // bof, try throw error if not found
        ),
        delay(2000)
      )
    );
  }
  create(entity: SignalDataItem): Promise<SignalDataItem> {
    this.dataList$.next([entity, ...this.dataList$.value]);
    return lastValueFrom(of(entity).pipe(delay(5000)));
  }
  update(entity: SignalDataItem): Promise<SignalDataItem> {
    this.dataList$.next(
      this.dataList$.value.map((dataItem) =>
        dataItem.id === entity.id ? entity : dataItem
      )
    );
    return lastValueFrom(
      of(entity).pipe(
        delay(2000),
        map(() => {
          throw new Error('Error in update'); // Simulate an error
        }),
        tap({
          next: (data) => console.log('[update] data', data),
          error: (error) => console.log('[update] error', error),
          complete: () => console.log('[update] complete'),
          subscribe: () => console.log('[update] subscribe'),
          unsubscribe: () => console.log('[update] unsubscribe'),
          finalize: () => console.log('[update] finalize'),
        })
      )
    );
  }
  updateAll(entity: SignalDataItem[]): Promise<SignalDataItem[]> {
    throw new Error('Method not implemented.');
  }
  delete(entity: SignalDataItem): Promise<void> {
    this.dataList$.next(
      this.dataList$.value.filter((dataItem) => dataItem.id !== entity.id)
    );
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 2000);
    });
  }
}
