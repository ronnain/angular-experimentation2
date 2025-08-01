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
import { StoreInput, Book, GetMatchedPaths } from './shared';

type FeatureOutput<
  Input extends SignalStoreFeatureResult,
  Feature extends SignalStoreFeature
> = Feature extends SignalStoreFeature<infer ResultInput, infer ResultOutput>
  ? SignalStoreFeature<Input, ResultOutput>
  : never;

// todo withStoreAccess in the config
export function withBooksFilter4<
  Feature extends typeof feature,
  Context extends SignalStoreFeatureResult,
  Store extends StoreInput<Context>,
  Config extends {
    booksPath: AllBooksPaths;
  },
  const AllBooksPaths = GetMatchedPaths<Store, Signal<Book[]>>
>(config: Config): FeatureOutput<Context, typeof feature> {
  const feature = signalStoreFeature(
    withState({ query: '' }),
    withComputed((store) => ({
      filteredBooks: computed(() =>
        (
          (store as Record<string, unknown>)[
            config.booksPath as string
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
