import { computed, signal, Signal } from '@angular/core';
import {
  EmptyFeatureResult,
  patchState,
  Prettify,
  signalStore,
  SignalStoreFeature,
  signalStoreFeature,
  SignalStoreFeatureResult,
  StateSignals,
  withComputed,
  withFeature,
  withMethods,
  withProps,
  withState,
  WritableStateSource,
} from '@ngrx/signals';
import { withEntities } from '@ngrx/signals/entities';
import { boolean } from 'fp-ts';
type Book = {
  id: string;
  name: string;
  author: string;
};

export function withBooksFilter(books: Signal<Book[]>) {
  return signalStoreFeature(
    withState({ query: '' }),
    withComputed(({ query }) => ({
      filteredBooks: computed(() =>
        books().filter((b) => b.name.includes(query()))
      ),
    })),
    withMethods((store) => ({
      setQuery(query: string): void {
        patchState(store, { query });
      },
    }))
  );
}

type With<
  Context extends SignalStoreFeatureResult,
  CustomOutput extends SignalStoreFeature
> = {
  context: Context;
  store: Prettify<
    StateSignals<Context['state']> &
      Context['props'] &
      Context['methods'] &
      WritableStateSource<Prettify<Context['state']>>
  >;
  customOutputResult: ReturnType<CustomOutput> extends SignalStoreFeature<
    infer ResultInput,
    infer ResultOutput
  >
    ? ResultOutput
    : never;
};

export function withBooksFilterInfer<
  Context extends SignalStoreFeatureResult,
  Result extends ReturnType<typeof customFeature> extends SignalStoreFeature<
    infer ResultInput,
    infer ResultOutput
  >
    ? ResultOutput
    : never,
  Data extends With<Context, typeof customFeature>
>(
  booksFactory: (store: Data['store']) => Signal<Book[]>
): SignalStoreFeature<Context, Result> {
  const customFeature = signalStoreFeature(
    withState({ query: '' }),
    withComputed((store) => ({
      filteredBooks: computed(() =>
        booksFactory(store as any)().filter((b) =>
          b.name.includes(store.query())
        )
      ),
    })),
    withMethods((store) => ({
      setQuery(query: string): void {
        patchState(store, { query });
      },
    }))
  );
  //@ts-ignore
  return customFeature;
}

export const BooksStore = signalStore(
  withEntities<Book>(),
  // 👇 Using `withFeature` to pass input to the `withBooksFilter` feature.
  // withFeature(({ entities }) => withBooksFilter(entities)),
  // test((store) => ({
  //   test: 'test',
  // }))
  withBooksFilterInferWorks((store) => store.entities)
);

const test = new BooksStore();
//    ^?

const customFeatureBooks = (books: Signal<Book[]>) =>
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
type StoreInput<Input extends SignalStoreFeatureResult> = Prettify<
  StateSignals<Input['state']> &
    Input['props'] &
    Input['methods'] &
    WritableStateSource<Prettify<Input['state']>>
>;

export function withBooksFilterInferWorks<
  Input extends SignalStoreFeatureResult,
  const Store extends StoreInput<Input>,
  Output extends ReturnType<
    typeof customFeatureBooks
  > extends SignalStoreFeature<infer ResultInput, infer ResultOutput>
    ? ResultOutput
    : never
>(
  booksFactory: (store: Store) => Signal<Book[]>
): SignalStoreFeature<Input, Output> {
  //@ts-ignore
  return (context) => customFeatureBooks(booksFactory(context))(context);
}

const test2 = withBooksFilterInferWorks(() => signal<Book[]>([]));
//    ^?

function _with();
