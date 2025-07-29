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

type FeatureOutput<
  Input extends SignalStoreFeatureResult,
  Feature extends (data: any) => SignalStoreFeature
> = ReturnType<Feature> extends SignalStoreFeature<
  infer ResultInput,
  infer ResultOutput
>
  ? SignalStoreFeature<Input, ResultOutput>
  : never;

export function withBooksFilterInferWorks<
  Input extends SignalStoreFeatureResult,
  Store extends StoreInput<Input>
>(
  booksFactory: (store: Store) => Signal<Book[]>
): FeatureOutput<Input, typeof customFeatureBooks> {
  return featureFactory(booksFactory);
}

// const test2 = withBooksFilterInferWorks(() => signal<Book[]>([]));

function featureFactory<
  Input extends SignalStoreFeatureResult,
  Store extends StoreInput<Input>
>(featureFactory: (store: Store) => any): SignalStoreFeature<Input, any> {
  //@ts-ignore
  return (context) => customFeatureBooks(featureFactory(context))(context);
}

// todo slide sur Params:

type Params<Feature extends (...data: any) => SignalStoreFeature> =
  Feature extends (...data: infer Params) => SignalStoreFeature
    ? Params
    : never;

type TestParams = Params<typeof customFeatureBooks>;

function makeParams<Store, Params extends any[]>(...data: Params) {
  return (store: Store) => data;
}

function test2(...data: TestParams) {}
