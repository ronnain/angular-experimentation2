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
} from './types/util.type';
type Book = {
  id: string;
  name: string;
  author: string;
};

// export function withBooksFilter(books: Signal<Book[]>) {
//   return signalStoreFeature(
//     withState({ query: '' }),
//     withComputed(({ query }) => ({
//       filteredBooks: computed(() =>
//         books().filter((b) => b.name.includes(query()))
//       ),
//     })),
//     withMethods((store) => ({
//       setQuery(query: string): void {
//         patchState(store, { query });
//       },
//     }))
//   );
// }

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
type OneParams<Feature extends (data: any) => SignalStoreFeature> =
  Feature extends (data: infer Params) => SignalStoreFeature ? Params : never;

type TestParams = Params<typeof customFeatureBooks>;

// function makeParams<Store, Params extends any[]>(...data: Params) {
//   return (store: Store) => data;
// }

// function test2(...data: TestParams) {}

// const testParamFn = test2();

function withFeatureFactory<Feature extends (data: any) => SignalStoreFeature>(
  feature: Feature
) {
  return <
    Input extends SignalStoreFeatureResult,
    Store extends StoreInput<Input>
  >(
    entries: (store: Store) => OneParams<Feature>
  ) => ({} as FeatureOutput<Input, Feature>);
}

const withBooksFilter = withFeatureFactory((books: Signal<Book[]>) =>
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

const BooksStoreTest = signalStore(
  withEntities<Book>(),
  withBooksFilter((store) => store.entities)
);

const TestBooksStoreTest = new BooksStoreTest();

type ExpectSetQueryToBeRetrieved = Expect<
  Equal<typeof TestBooksStoreTest.setQuery, (query: string) => void>
>;
type ExpectSEntitiesToStillExist = Expect<
  Equal<typeof TestBooksStoreTest.entities, Signal<Book[]>>
>;

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

// type MergeStatePaths<A, B> = A | B;

// todo tester un truc comme ça :
const withBooksFilterAdvanced = withFeatureFactory3(
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
  <Input, Store>(options: any) => ({} as { books: Signal<Book[]> })
);
