import { Signal, computed } from '@angular/core';
import {
  patchState,
  signalStoreFeature,
  SignalStoreFeature,
  SignalStoreFeatureResult,
  withComputed,
  withFeature,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  StoreInput,
  OneParams,
  FeatureOutput,
  Book,
  GetMatchedPaths,
} from './shared';

function withFeatureFactory<Feature extends (data: any) => SignalStoreFeature>(
  feature: Feature
) {
  return <
    Context extends SignalStoreFeatureResult,
    Store extends StoreInput<Context>
  >(
    entriesFactory: (
      store: Store
    ) => (input: NoInfer<Context>, store: Store) => OneParams<Feature>
  ) =>
    ((context: Context) =>
      signalStoreFeature(
        withFeature((store) => {
          return feature(
            entriesFactory(store as Store)(context as Context, store as Store)
          );
        })
        //@ts-ignore
      )(context)) as unknown as FeatureOutput<Context, Feature>;
}

// ! Using an intermediate function to allow to infer types from input/output from the config and reuse it in the config
export function booksSelector<
  Input extends SignalStoreFeatureResult,
  Store extends StoreInput<Input>,
  BooksOutput extends {
    books: Signal<Book[]>;
  }
>(config: {
  booksPath: GetMatchedPaths<Store, Signal<Book[]>>;
}): (input: Input, store: Store) => BooksOutput {
  return (input, store) => {
    return {
      books: store[config.booksPath as string],
    } as unknown as BooksOutput;
  };
}

export const withBooksFilter3 = withFeatureFactory(
  ({ books }: { books: Signal<Book[]> }) =>
    signalStoreFeature(
      withState({ query: '' }),
      withComputed((store) => {
        console.log('books()', books);
        return {
          filteredBooks: computed(() =>
            books().filter((b) => b.name.includes(store.query()))
          ),
        };
      }),
      withMethods((store) => ({
        setQuery(query: string): void {
          patchState(store, { query });
        },
      }))
    )
);
