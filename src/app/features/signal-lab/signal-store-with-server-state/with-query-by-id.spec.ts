import { TestBed } from '@angular/core/testing';
import { signalStore } from '@ngrx/signals';
import { lastValueFrom, of } from 'rxjs';
import { withQueryById } from './with-query-by-id';

describe('withQueryById', () => {
  it('1- Should expose a query resource', () => {
    const Store = signalStore(
      withQueryById('user', () =>
        queryById({
          params: () => '5',
          loader: ({ params }) => {
            return lastValueFrom(
              of({
                id: params,
                name: 'John Doe',
                email: 'test@a.com',
              })
            );
          },
        })
      )
    );

    TestBed.configureTestingModule({
      providers: [Store],
    });
    const store = TestBed.inject(Store);

    expect(store.userQueryById).toBeDefined();
  });
});
