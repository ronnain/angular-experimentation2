import { Type } from '@angular/core';
import { Observable } from 'rxjs';

type NonRecord =
  | Iterable<any>
  | WeakSet<any>
  | WeakMap<any, any>
  | Promise<any>
  | Date
  | Error
  | RegExp
  | ArrayBuffer
  | DataView
  | Function;

export type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type IsRecord<T> = T extends object
  ? T extends NonRecord
    ? false
    : true
  : false;

export type IsUnknownRecord<T> = string extends keyof T
  ? true
  : number extends keyof T
  ? true
  : false;

export type IsKnownRecord<T> = IsRecord<T> extends true
  ? IsUnknownRecord<T> extends true
    ? false
    : true
  : false;

export type OmitPrivate<T> = {
  [K in keyof T as K extends `_${string}` ? never : K]: T[K];
};

export type MethodsDictionary = Record<string, Function>;

export type StateSignals<State> = IsKnownRecord<Prettify<State>> extends true
  ? {
      [Key in keyof State]: IsKnownRecord<State[Key]> extends true
        ? State[Key]
        : State[Key];
    }
  : {};

export type InnerSignalStore<
  State extends object = object,
  Props extends object = object,
  Methods extends MethodsDictionary = MethodsDictionary
> = {
  stateSignals: StateSignals<State>;
  props: Props;
  methods: Methods;
};

export type SignalStoreFeatureResult = {
  state: object;
  props: object;
  methods: MethodsDictionary;
};

export type EmptyFeatureResult = { state: {}; props: {}; methods: {} };

export type SignalStoreFeature<
  Input extends SignalStoreFeatureResult = SignalStoreFeatureResult,
  Output extends SignalStoreFeatureResult = SignalStoreFeatureResult
> = (
  store: InnerSignalStore<Input['state'], Input['props'], Input['methods']>
) => InnerSignalStore<Output['state'], Output['props'], Output['methods']>;

type SignalStoreMembers<FeatureResult extends SignalStoreFeatureResult> =
  Prettify<
    OmitPrivate<
      StateSignals<FeatureResult['state']> &
        FeatureResult['props'] &
        FeatureResult['methods']
    >
  >;

export function signalStore<F1 extends SignalStoreFeatureResult>(
  f1: SignalStoreFeature<EmptyFeatureResult, F1>
): SignalStoreMembers<F1>;
export function signalStore<
  F1 extends SignalStoreFeatureResult,
  F2 extends SignalStoreFeatureResult,
  R extends SignalStoreFeatureResult = F1 & F2
>(
  f1: SignalStoreFeature<EmptyFeatureResult, F1>,
  f2: SignalStoreFeature<{} & F1, F2>
): Type<SignalStoreMembers<R>>;
/////////////////////////////////////////////////////////////////

export type StoreFeatureResult = {
  //   srcGetEntities: SrcGetEntities;
  //   entities:
  //     | ((srcContext: SrcGetEntities) => Observable<Entities[]>)
  //     | undefined;
  entityActionLevelName: object;
  entityActionLevel: object;
  selectors: object;
  // methods: MethodsDictionary;
};
export type StoreFeature<
  Input extends StoreFeatureResult = StoreFeatureResult,
  Output extends StoreFeatureResult = StoreFeatureResult
> = (
  store: InnerStore<
    // Input['srcGetEntities'],
    // Input['entities'],
    Input['entityActionLevelName'],
    Input['entityActionLevel'],
    Input['selectors']
  >
) => InnerStore<
  //   Output['srcGetEntities'],
  //   Output['entities'],
  Output['entityActionLevelName'],
  Output['entityActionLevel'],
  Output['selectors']
>;

type EntitiesStateEntitiesStore<TData, TSrcContext> = {
  src: () => Observable<TSrcContext>;
  api: (srcContext: TSrcContext) => Observable<TData[]>;
  initialData: TData[];
};

export type InnerStore<
  EntityActionLevelName extends string = string,
  EntityActionLevel extends object = object,
  Selectors extends object = object
  //   Methods extends MethodsDictionary = MethodsDictionary
> = {
  //   srcGetEntities: SrcGetEntities;
  //   entities:
  //     | ((srcContext: SrcGetEntities) => Observable<Entities[]>)
  //     | undefined;
  entityActionLevelName: EntityActionLevelName;
  entityActionLevel: EntityActionLevel;
  selectors: Selectors;
  //   methods: Methods;
};

type EmptyStoreFeatureResult = {
  //   srcGetEntities: object;
  //   entities: undefined;
  entityActionLevelName: object;
  entityActionLevel: object;
  selectors: object;
};

function store<
  //   SrcGetEntities,
  //   Entities,
  F1 extends StoreFeatureResult,
  F2 extends StoreFeatureResult,
  R extends StoreFeatureResult = F1 & F2
>(
  f1: StoreFeature<EmptyStoreFeatureResult, F1>,
  f2: StoreFeature<{} & F1, F2>
) {
  return {} as R;
}

const test = store(
  (innerStore) => {
    return {
      //   srcGetEntities: () => new Observable<{ page: 1 }>(),
      //   srcGetEntities: {},
      //   entities: {},
      entityActionLevelName: {},
      entityActionLevel: {
        update: true,
        create: false,
      },
      selectors: {},
      // methods: MethodsDictionary;
    };
  },
  (innerStore) => {
    return {
      //   srcGetEntities: () => new Observable<{ page: 1 }>(),
      //   entities: {
      //     api: (srcContext) =>
      //       new Observable<{
      //         id: string;
      //         name: string;
      //       }>(),
      //   },
      entityActionLevelName: {
        update: true,
        create: false,
      },
      entityActionLevel: {},
      selectors: {},
      // methods: MethodsDictionary;
    };
  }
);

test.entityActionLevelName.update;
