import {
  SignalStoreFeatureResult,
  Prettify,
  StateSignals,
  WritableStateSource,
} from '@ngrx/signals';
import { ResourceWithParamsOrParamsFn } from './types/resource-with-params-or-params-fn.type';
import { InternalType } from './types/util.type';
import { QueryRef } from './with-query';
import { resource, ResourceOptions, Signal, signal } from '@angular/core';
import { __INTERNAL_QueryBrand } from './types/brand';

export function query<
  QueryState extends object | undefined,
  QueryParams,
  QueryArgsParams,
  Input extends SignalStoreFeatureResult,
  const StoreInput extends Prettify<
    StateSignals<Input['state']> &
      Input['props'] &
      Input['methods'] &
      WritableStateSource<Prettify<Input['state']>>
  >
>(
  queryConfig: Omit<
    ResourceWithParamsOrParamsFn<QueryState, QueryParams, QueryArgsParams>,
    'method'
  >
): (
  store: StoreInput,
  context: Input
) => {
  queryRef: QueryRef<NoInfer<QueryState>, NoInfer<QueryParams>>;
  /**
   * Only used to help type inference, not used in the actual implementation.
   */
  __types: InternalType<
    NoInfer<QueryState>,
    NoInfer<QueryParams>,
    NoInfer<QueryArgsParams>,
    false
  >;
  [__INTERNAL_QueryBrand]: true;
} {
  const queryResourceParamsFnSignal = signal<QueryParams | undefined>(
    undefined
  );

  const resourceParamsSrc = queryConfig.params ?? queryResourceParamsFnSignal;

  const queryResource = resource<QueryState, QueryParams>({
    ...queryConfig,
    params: resourceParamsSrc,
  } as ResourceOptions<any, any>);

  return (store, context) => ({
    queryRef: {
      resource: queryResource,
      resourceParamsSrc: resourceParamsSrc as Signal<QueryParams | undefined>,
    },
    __types: {} as InternalType<
      NoInfer<QueryState>,
      NoInfer<QueryParams>,
      NoInfer<QueryArgsParams>,
      false
    >,
    [__INTERNAL_QueryBrand]: true,
  });
}
