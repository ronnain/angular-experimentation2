import {
  Prettify,
  SignalStoreFeatureResult,
  StateSignals,
  WritableStateSource,
} from '@ngrx/signals';
import { InternalType } from './types/util.type';
import { QueryByIdRef } from './with-query-by-id';
import { Signal, signal } from '@angular/core';
import { rxResourceById } from '../rx-resource-by-id';
import { RxResourceByIdConfig } from './types/rx-resource-by-id-config.type';

export function rxQueryById<
  QueryState extends object | undefined,
  QueryParams,
  QueryArgsParams,
  QueryGroupIdentifier extends string | number,
  Input extends SignalStoreFeatureResult,
  const StoreInput extends Prettify<
    StateSignals<Input['state']> &
      Input['props'] &
      Input['methods'] &
      WritableStateSource<Prettify<Input['state']>>
  >
>(
  queryConfig: Omit<
    RxResourceByIdConfig<
      QueryState,
      QueryParams,
      QueryArgsParams,
      QueryGroupIdentifier
    >,
    'method'
  >
): (
  store: StoreInput,
  context: Input
) => {
  queryByIdRef: QueryByIdRef<
    NoInfer<QueryGroupIdentifier>,
    NoInfer<QueryState>,
    NoInfer<QueryParams>
  >;
  /**
   * Only used to help type inference, not used in the actual implementation.
   */
  __types: InternalType<
    NoInfer<QueryState>,
    NoInfer<QueryParams>,
    NoInfer<QueryArgsParams>,
    false,
    NoInfer<QueryGroupIdentifier>
  >;
} {
  const queryResourceParamsFnSignal = signal<QueryParams | undefined>(
    undefined
  );

  const resourceParamsSrc = queryConfig.params ?? queryResourceParamsFnSignal;

  const queryResourcesById = rxResourceById<
    QueryState,
    QueryParams,
    QueryGroupIdentifier
  >({
    ...queryConfig,
    params: resourceParamsSrc,
  } as any);
  return (store, context) => ({
    queryByIdRef: {
      resourceById: queryResourcesById,
      resourceParamsSrc: resourceParamsSrc as Signal<QueryParams | undefined>,
    },
    __types: {} as InternalType<
      NoInfer<QueryState>,
      NoInfer<QueryParams>,
      NoInfer<QueryArgsParams>,
      false,
      NoInfer<QueryGroupIdentifier>
    >,
  });
}
