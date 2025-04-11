import { TestBed, waitForAsync } from '@angular/core/testing';
import { DataListStore } from './storev2';
import { BehaviorSubject, of } from 'rxjs';
import { Pagination } from './data-list.component';

describe('InjectionToken', () => {
  it('should inject the default value', (done) => {
    const pagination$ = new BehaviorSubject<Pagination>({
      page: 1,
      pageSize: 5,
    });

    const store = TestBed.inject(DataListStore)({
      entitiesSrc: {
        srcContext: pagination$,
        api: (srcContext) =>
          of([
            { id: '1', name: 'Item 1' },
            { id: '2', name: 'Item 2' },
            { id: '3', name: 'Item 3' },
          ]),
        initialData: [],
      },
      entityIdSelector: (item) => item.id,
    });
    store.data.subscribe((value) => {
      console.log('value', value);
      expect(value.isLoading).toBe(true);
      done();
    });
  });
});
