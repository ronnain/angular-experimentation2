import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
} from '@ngrx/signals';
import { Book } from './shared';
import { setAllEntities, withEntities } from '@ngrx/signals/entities';
import { computed, Signal } from '@angular/core';
import { expectTypeOf } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { withBooksFilter4 } from './4-advanced-custom-config';

describe('withBooksFilter4', () => {
  it('should filter books by query', () => {
    const BooksStore = signalStore(
      withEntities<Book>(),
      withComputed(({ entities }) => ({
        topBooks: computed(() => entities().slice(0, 3)),
        total: computed(() => entities().length),
      })),
      withBooksFilter4({
        booksPath: 'entities', // 👉 autocomplete: 'entities' | 'topBooks'
      }),
      withHooks((store) => ({
        onInit: () => {
          patchState(
            store,
            setAllEntities([
              { id: '1', name: 'Angular Basics', author: 'John Doe' },
              { id: '2', name: 'React Basics', author: 'Jane Doe' },
              { id: '3', name: 'Vue Basics', author: 'Alice Smith' },
              { id: '4', name: 'Svelte Basics', author: 'Bob Johnson' },
              { id: '5', name: 'Solid Basics', author: 'Charlie Brown' },
              { id: '6', name: 'Lit Basics', author: 'Diana Prince' },
            ])
          );
        },
      }))
    );
    TestBed.configureTestingModule({
      providers: [BooksStore],
    });
    const store = TestBed.inject(BooksStore);

    expect(store.filteredBooks()).toEqual(store.filteredBooks());

    store.setQuery('Angular');
    const filteredBooks = store.filteredBooks();
    expect(filteredBooks).toEqual([
      { id: '1', name: 'Angular Basics', author: 'John Doe' },
    ]);
  });

  it('Should be typed', () => {
    const BooksStore = signalStore(
      withEntities<Book>(),
      withComputed(({ entities }) => ({
        topBooks: computed(() => entities().slice(0, 3)),
        total: computed(() => entities().length),
      })),
      withBooksFilter4({
        booksPath: 'entities', // 👉 autocomplete: 'entities' | 'topBooks'
      }),
      withBooksFilter4({
        //@ts-expect-error
        booksPath: 'error', // 👉 autocomplete: 'entities' | 'topBooks'
      })
    );

    const store = new BooksStore();

    expectTypeOf(store.filteredBooks).toEqualTypeOf<Signal<Book[]>>();
    expectTypeOf(store.setQuery).toEqualTypeOf<(query: string) => void>();
    expectTypeOf(store.entities).toEqualTypeOf<Signal<Book[]>>();
  });
});
