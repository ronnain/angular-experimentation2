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
import { Book, FeatureOutput, OneParams, StoreInput } from './shared';
import { computed, Signal } from '@angular/core';

function withFeatureFactory<Feature extends (data: any) => SignalStoreFeature>(
  feature: Feature
) {
  return <
    Input extends SignalStoreFeatureResult,
    Store extends StoreInput<Input>
  >(
    entries: (store: Store) => OneParams<Feature>
  ) =>
    withFeature((store) => feature(entries(store as Store))) as FeatureOutput<
      Input,
      Feature
    >;
}

// ! This technique only accepts one parameter
export const withBooksFilter1 = withFeatureFactory((books: Signal<Book[]>) =>
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
  )
);
