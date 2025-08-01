import { computed, Output, signal, Signal } from '@angular/core';
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
import { boolean, extend } from 'fp-ts';
import { Equal, Expect } from '../../../../../test-type';
import {
  HasChild,
  MakeOptionalPropertiesRequired,
  UnionToTuple,
} from '../signal-store-with-server-state/types/util.type';
import { Book, FeatureOutput, OneParams, StoreInput } from './shared';

export const BooksStore = signalStore(
  withEntities<Book>(),
  withBooksFilterInferWorks((store) => store.entities)
);

const BooksStoreResult = new BooksStore();

type ExpectSetQueryToBeRetrievedBooksStoreResult = Expect<
  Equal<typeof BooksStoreResult.setQuery, (query: string) => void>
>;
type ExpectSEntitiesToStillExistBooksStoreResult = Expect<
  Equal<typeof BooksStoreResult.entities, Signal<Book[]>>
>;

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

// const test2 = withBooksFilterInferWorks(() => signal<Book[]>([]));

function withFeatureFactory2<Feature extends (data: any) => SignalStoreFeature>(
  feature: Feature
) {
  return <
    Input extends SignalStoreFeatureResult,
    Store extends StoreInput<Input>
  >(
    entries: (
      store: Store
    ) => (input: NoInfer<Input>, store: Store) => OneParams<Feature>
  ) => ({} as FeatureOutput<Input, Feature>);
}

function booksSelector<
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

const withBooksFilterAdvanced = withFeatureFactory2(
  ({ books }: { books: Signal<Book[]> }) =>
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

const BooksStoreAdvanced = signalStore(
  withEntities<Book>(),
  withComputed(({ entities }) => ({
    topBooks: computed(() => entities().slice(0, 3)),
    total: computed(() => entities().length),
  })),
  //                        👇 access to the store for advanced case
  withBooksFilterAdvanced((store) =>
    booksSelector({
      booksPath: 'entities', // 👉 autocomplete: 'entities' | 'topBooks'
    })
  )
);

type TestState = {
  test1: string;
  test2: {
    data: boolean;
  };
  test3: number;
  test4: string;
};

type test = GetMatchedPaths<TestState, string>;

type GetMatchedPaths<State extends object, TargetedType> = {
  [Key in keyof State]: State[Key] extends TargetedType
    ? Key
    : State[Key] extends object
    ? GetMatchedPaths<State[Key], TargetedType>
    : never;
}[keyof State];

///////////// 3

function withFeatureFactory3<
  Feature extends (data: any) => SignalStoreFeature,
  I,
  S
>(feature: Feature, customOutput: (input: I, store: S) => OneParams<Feature>) {
  return <
    Input extends SignalStoreFeatureResult,
    Store extends StoreInput<Input>
  >(
    entries: (
      store: Store
    ) => (input: NoInfer<Input>, store: Store) => OneParams<Feature>
  ) => ({} as FeatureOutput<Input, Feature>);
}

function withFeatureFactory3bis<
  Feature extends (data: any) => SignalStoreFeature,
  Config
>(feature: Feature, config: Config) {
  return <
    Input extends SignalStoreFeatureResult,
    Store extends StoreInput<Input>
  >(
    entries: (store: Store) => Config
  ) => ({} as FeatureOutput<Input, Feature>);
}

// const testHelper =  <
//   Input extends SignalStoreFeatureResult,
//   Store extends StoreInput<Input>,
//   BooksOutput extends {
//     books: Signal<Book[]>;
//   }
// >(config: {
//   booksPath: GetMatchedPaths<Store, Signal<Book[]>>;
// }): (input: Input, store: Store) => BooksOutput {
//   return (input, store) => {
//     return {
//       books: store[config.booksPath as string],
//     } as unknown as BooksOutput;
//   };
// }

// type TypeOptions<Input extends SignalStoreFeatureResult,
//   Store extends StoreInput<Input>>
// const TypeOptions = <
//   Input extends SignalStoreFeatureResult,
//   Store extends StoreInput<Input> = StoreInput<Input>,
//   Config = object
// >(
//   config: Config
// ) => {
//   return config;
// };
// todo tester un truc comme ça
const withBooksFilterAdvanced3bis = withFeatureFactory3bis(
  ({ books }: { books: Signal<Book[]> }) =>
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
    ),
  <Store extends unknown>(store: Store) => ({
    // todo voir si on peut générer des types à partir du store
    books: signal<Book[]>([]).asReadonly(),
    booksPath: '' as Store extends object
      ? GetMatchedPaths<Store, Signal<Book[]>>
      : string,
  })
);

const BooksStoreAdvanced3bis = signalStore(
  withEntities<Book>(),
  withComputed(({ entities }) => ({
    topBooks: computed(() => entities().slice(0, 3)),
    total: computed(() => entities().length),
  })),
  //                           👇 access to the store for advanced case
  withBooksFilterAdvanced3bis((store) => (storeInner) => ({
    books: store.entities,
    booksPath: 'entities',
  }))
);
// todo
// const { withFeature: withBooksFilter, selector: booksSelector } =
//   WithFeatureMaker(featureFactory, config, mapperConfigToFeatureInput);
// todo tester avec un style de pipe pattern ?

// !  Test
type With2<Context extends SignalStoreFeatureResult, CustomOutput> = {
  context: Context;
  store: Prettify<
    StateSignals<Context['state']> &
      Context['props'] &
      Context['methods'] &
      WritableStateSource<Prettify<Context['state']>>
  >;
  output: CustomOutput extends () => infer ReturnValue
    ? ReturnValue extends SignalStoreFeature<
        infer ResultInput,
        infer ResultOutput
      >
      ? ResultOutput
      : never
    : never;
  finalOutput: SignalStoreFeature<
    Context,
    CustomOutput extends () => infer ReturnValue
      ? ReturnValue extends SignalStoreFeature<
          infer ResultInput,
          infer ResultOutput
        >
        ? ResultOutput
        : never
      : never
  >;
};
// todo pipe

function featureMapper<__Feature, ConfigResult>(
  mapper: (config: ConfigResult) => __Feature
) {
  return mapper;
}

function withBooksFilterUsingCustomConfigAndStoreAccess<
  __Feature extends typeof feature,
  __Context extends SignalStoreFeatureResult,
  __Data extends With2<__Context, __Feature>,
  ConfigResult extends {
    booksPath: AllBooksPaths;
  },
  const AllBooksPaths = GetMatchedPaths<__Data['store'], Signal<Book[]>>
>(
  configFactory: (store: __Data['store']) => ConfigResult
): FeatureOutput<__Context, typeof feature> {
  const mapping = featureMapper<__Feature, ConfigResult>((config) => {
    return {} as __Feature;
  });
  const feature = ({ books }: { books: Signal<Book[]> }) =>
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
  //@ts-ignore
  return feature;
}

export const BooksStoreUsingCustomConfigAndStoreAccess = signalStore(
  withEntities<Book>(),
  withComputed(({ entities }) => ({
    topBooks: computed(() => entities().slice(0, 3)),
    total: computed(() => entities().length),
  })),
  withBooksFilterUsingCustomConfigAndStoreAccess((store) => ({
    booksPath: 'entities',
  }))
);

const BooksStoreUsingCustomConfigAndStoreAccessResult =
  new BooksStoreUsingCustomConfigAndStoreAccess();

type ExpectSetQueryToBeRetrievedBooksStoreUsingCustomConfigAndStoreAccessResult =
  Expect<
    Equal<
      typeof BooksStoreUsingCustomConfigAndStoreAccessResult.setQuery,
      (query: string) => void
    >
  >;
type ExpectSEntitiesToStillExistBooksStoreUsingCustomConfigAndStoreAccessResult =
  Expect<
    Equal<
      typeof BooksStoreUsingCustomConfigAndStoreAccessResult.entities,
      Signal<Book[]>
    >
  >;

function withBooksFilterUsingCustomConfig<
  Feature extends typeof feature,
  __Context extends SignalStoreFeatureResult,
  __Data extends With2<__Context, Feature>,
  ConfigResult extends {
    booksPath: AllBooksPaths;
  },
  const AllBooksPaths = GetMatchedPaths<__Data['store'], Signal<Book[]>>
>(configFactory: ConfigResult): FeatureOutput<__Context, typeof feature> {
  const mapping = featureMapper<Feature, ConfigResult>((config) => {
    return {} as Feature;
  });
  const feature = ({ books }: { books: Signal<Book[]> }) =>
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
  //@ts-ignore
  return feature;
}

export const BooksStoreUsingCustomConfig = signalStore(
  withEntities<Book>(),
  withComputed(({ entities }) => ({
    topBooks: computed(() => entities().slice(0, 3)),
    total: computed(() => entities().length),
  })),
  withBooksFilterUsingCustomConfig({
    booksPath: 'entities',
  })
);

const BooksStoreUsingCustomConfigResult = new BooksStoreUsingCustomConfig();

type ExpectSetQueryToBeRetrievedBooksStoreUsingCustomConfigResult = Expect<
  Equal<
    typeof BooksStoreUsingCustomConfigResult.setQuery,
    (query: string) => void
  >
>;
type ExpectEntitiesToStillExistBooksStoreUsingCustomConfigResult = Expect<
  Equal<typeof BooksStoreUsingCustomConfigResult.entities, Signal<Book[]>>
>;
