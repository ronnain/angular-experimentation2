import { Signal, computed } from '@angular/core';
import {
  patchState,
  signalStoreFeature,
  SignalStoreFeature,
  SignalStoreFeatureResult,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { StoreInput, Book, GetMatchedPaths, FeatureOutput } from './shared';

type FeatureOutputFromConfig<
  Input extends SignalStoreFeatureResult,
  Feature extends SignalStoreFeature
> = Feature extends SignalStoreFeature<infer ResultInput, infer ResultOutput>
  ? SignalStoreFeature<Input, ResultOutput>
  : never;

export function withBooksFilter4bis<
  Context extends SignalStoreFeatureResult,
  Store extends StoreInput<Context>,
  // 👇 Create a highly customized based on Context/Store typing data
  Config extends (store: Store) => {
    booksPath: AllBooksPaths;
  },
  const AllBooksPaths = GetMatchedPaths<Store, Signal<Book[]>>
>(config: Config): FeatureOutputFromConfig<Context, typeof feature> {
  const feature = signalStoreFeature(
    withState({ query: '' }),
    withComputed((store) => ({
      filteredBooks: computed(() =>
        (
          (store as Record<string, unknown>)[
            config(store as Store).booksPath as string
          ] as Signal<Book[]>
        )().filter((b) => b.name.includes(store.query()))
      ),
    })),
    withMethods((store) => ({
      setQuery(query: string): void {
        patchState(store, { query });
      },
    }))
  );

  return feature;
}
