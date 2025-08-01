import { patchState, signalStore, withHooks } from '@ngrx/signals';
import { Book } from './shared';
import { setAllEntities, withEntities } from '@ngrx/signals/entities';
import { Signal } from '@angular/core';
import { expectTypeOf } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { withBooksFilter1 } from './1-simple-only-one-helper-to-use';

describe('withBooksFilter1', () => {
  it('should filter books by query', () => {
    const BooksStore = signalStore(
      withEntities<Book>(),
      withBooksFilter1((store) => store.entities),
      withHooks((store) => ({
        onInit: () => {
          patchState(
            store,
            setAllEntities([
              { id: '1', name: 'Angular Basics', author: 'John Doe' },
              { id: '2', name: 'React Basics', author: 'Jane Doe' },
            ])
          );
        },
      }))
    );
    TestBed.configureTestingModule({
      providers: [BooksStore],
    });
    const store = TestBed.inject(BooksStore);

    expect(store.filteredBooks()).toEqual(store.entities());

    store.setQuery('Angular');
    const filteredBooks = store.filteredBooks();
    expect(filteredBooks).toEqual([
      { id: '1', name: 'Angular Basics', author: 'John Doe' },
    ]);
  });

  it('Should be typed', () => {
    const BooksStore = signalStore(
      withEntities<Book>(),
      withBooksFilter1((store) => {
        expectTypeOf(store.entities).toEqualTypeOf<Signal<Book[]>>();
        return store.entities;
      })
    );

    const store = new BooksStore();

    expectTypeOf(store.filteredBooks).toEqualTypeOf<Signal<Book[]>>();
    expectTypeOf(store.setQuery).toEqualTypeOf<(query: string) => void>();
    expectTypeOf(store.entities).toEqualTypeOf<Signal<Book[]>>();
  });
});
