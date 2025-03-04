import { Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DataItem, DataListService } from './data-list.service';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, interval, Subject } from 'rxjs';
import { Store } from './store';

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

  updateItemTest(id: number) {
    this.updateItem$.next({
      id,
      name: 'Item 1 TEST UPDATE' + Math.random(),
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
}
