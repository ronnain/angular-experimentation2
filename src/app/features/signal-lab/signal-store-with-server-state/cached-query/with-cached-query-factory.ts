import {
  SignalStoreFeatureResult,
  Prettify,
  StateSignals,
  WritableStateSource,
} from '@ngrx/signals';
import { InternalType } from '../types/util.type';
import { QueryRef, QueryOptions, withQuery } from '../with-query';

export function withCachedQueryFactory<
  const QueryName extends string,
  QueryState extends object | undefined,
  QueryParams
>(
  name: QueryName,
  query: (
    store: any,
    context: any
  ) => {
    queryRef: QueryRef<QueryState, QueryParams>;
    __types: InternalType<QueryState, QueryParams, unknown, false>;
  }
) {
  return <
    Input extends SignalStoreFeatureResult,
    const StoreInput extends Prettify<
      StateSignals<Input['state']> &
        Input['props'] &
        Input['methods'] &
        WritableStateSource<Prettify<Input['state']>>
    >
  >(
    options?: QueryOptions<StoreInput, Input, QueryState, QueryParams, unknown>
  ) => withQuery(name, (store) => query, options);
}

export function withCachedQueryToPlugFactory<
  const QueryName extends string,
  QueryState extends object | undefined,
  QueryParams,
  PlugData
>(
  name: QueryName,
  query: <
    Input extends SignalStoreFeatureResult,
    QueryStoreInput extends Prettify<
      StateSignals<Input['state']> &
        Input['props'] &
        Input['methods'] &
        WritableStateSource<Prettify<Input['state']>>
    >
  >(
    data: PlugData
  ) => (
    store: QueryStoreInput,
    context: Input
  ) => {
    queryRef: QueryRef<QueryState, QueryParams>;
    __types: InternalType<QueryState, QueryParams, unknown, false>;
  }
) {
  return <
    Input extends SignalStoreFeatureResult,
    const StoreInput extends Prettify<
      StateSignals<Input['state']> &
        Input['props'] &
        Input['methods'] &
        WritableStateSource<Prettify<Input['state']>>
    >
  >(
    dataToPlug: (store: StoreInput) => PlugData,
    options?: QueryOptions<StoreInput, Input, QueryState, QueryParams, unknown>
  ) => {
    return withQuery(name, (store) => query(dataToPlug(store)), options);
  };
}
