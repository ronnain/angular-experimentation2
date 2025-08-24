import {
  SignalStoreFeatureResult,
  Prettify,
  StateSignals,
  WritableStateSource,
} from '@ngrx/signals';
import { InternalType } from '../types/util.type';
import { QueryRef, QueryOptions, withQuery } from '../with-query';
import { SignalProxy, SignalWrapperParams } from '../signal-proxy';

export function withCachedQueryFactory<
  const QueryName extends string,
  QueryState extends object | undefined,
  QueryParams
>(
  name: QueryName,
  queryRef: {
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
  ) => withQuery(name, (store) => () => queryRef, options);
}

export function withCachedQueryToPlugFactory<
  const QueryName extends string,
  QueryState extends object | undefined,
  QueryParams,
  PlugData extends object
>(
  name: QueryName,
  querySourceProxy: SignalProxy<PlugData, true>,
  query: <
    Input extends SignalStoreFeatureResult,
    QueryStoreInput extends Prettify<
      StateSignals<Input['state']> &
        Input['props'] &
        Input['methods'] &
        WritableStateSource<Prettify<Input['state']>>
    >
  >(
    querySource: SignalWrapperParams<PlugData>
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
    options?: QueryOptions<
      StoreInput,
      Input,
      QueryState,
      QueryParams,
      unknown,
      {
        setQuerySource?: (
          source: SignalProxy<PlugData>
        ) => SignalWrapperParams<PlugData>;
      }
    >
  ) => {
    return withQuery(
      name,
      (store) =>
        query(
          options?.(store)?.setQuerySource?.(
            querySourceProxy as unknown as SignalProxy<PlugData>
          ) as SignalWrapperParams<PlugData>
        ),
      options
    );
  };
}
