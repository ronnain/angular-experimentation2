import {
  patchState,
  signalStore,
  signalStoreFeature,
  withComputed,
  withFeature,
  withMethods,
  withState,
} from '@ngrx/signals';
import { computed, Signal } from '@angular/core';
import { withEntities } from '@ngrx/signals/entities';
import { withBooksFilter4bis } from './4bis-advanced-custom-config';
import { withBooksFilter4 } from './4-advanced-custom-config';
import { withBooksFilter1 } from './1-simple-only-one-helper-to-use';
import { withBooksFilter2 } from './2-simple-with-helper';
import { booksSelector, withBooksFilter3 } from './3-higly-custom-config';
import { Book } from './shared';

const filteredBooksFeature = (books: Signal<Book[]>) =>
  signalStoreFeature(
    withState({ query: '' }),
    withComputed((store) => ({
      filteredBooks: computed(() =>
        books().filter((b) => b.name.includes(store.query()))
      ),
    })),
    withMethods((store) => ({
      setQuery(query: string): void {
        patchState(store, { query });
      },
    }))
  );

const BooksStore = signalStore(
  withEntities<Book>(),
  withComputed(({ entities }) => ({
    topBooks: computed(() => entities().slice(0, 3)),
    topDadBooks: computed(() => entities().slice(0, 3)),
    topMomBooks: computed(() => entities().slice(0, 3)),
    topDevBooks: computed(() => entities().slice(0, 3)),
    total: computed(() => entities().length),
  })),

  // ⚠️ Before 👇
  withFeature(({ entities }) => filteredBooksFeature(entities)), // 👈 NgRx example

  // ✅ After 👇
  withBooksFilter1(({ entities }) => entities),
  withBooksFilter2(({ entities }) => entities),
  withBooksFilter3((store) => booksSelector({ booksPath: 'topMomBooks' })), // 👉  autocomplete: 'entities' | 'topBooks'...
  withBooksFilter4({
    booksPath: 'topDadBooks', // 👉 autocomplete: 'entities' | 'topBooks' | 'topDadBooks' | 'topMomBooks' | 'topDevBooks'
  }),
  withBooksFilter4bis((store) => ({
    booksPath: 'topMomBooks', // 👉  autocomplete: 'entities' | 'topBooks' | 'topDadBooks' | 'topMomBooks' | 'topDevBooks'
  }))
);
