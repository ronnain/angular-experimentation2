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
