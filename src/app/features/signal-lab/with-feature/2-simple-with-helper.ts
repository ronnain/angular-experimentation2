import { computed, Signal } from '@angular/core';
import {
  patchState,
  signalStoreFeature,
  SignalStoreFeatureResult,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  Book,
  featureFactory,
  FeatureOutput,
  OneParams,
  StoreInput,
} from './shared';

// ! Only accept one parameter
const filterBooksFeature = (books: Signal<Book[]>) =>
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

export function withBooksFilter2<
  Input extends SignalStoreFeatureResult,
  Store extends StoreInput<Input>
>(
  featureConfigFactory: (store: Store) => OneParams<typeof filterBooksFeature>
): FeatureOutput<Input, typeof filterBooksFeature> {
  return featureFactory(featureConfigFactory, filterBooksFeature);
}
