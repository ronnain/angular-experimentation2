import {
  ResourceOptions,
  ResourceRef,
  effect,
  resource,
  signal,
} from '@angular/core';
import {
  patchState,
  Prettify,
  SignalStoreFeature,
  signalStoreFeature,
  SignalStoreFeatureResult,
  StateSignals,
  withProps,
  WritableStateSource,
} from '@ngrx/signals';
import { MergeObject } from './types/util.type';
import { Merge } from '../../../util/types/merge';
import { createNestedStateUpdate } from './update-state.util';
import { ObjectDeepPath } from './types/object-deep-path-mapper.type';
import {
  AccessTypeObjectPropertyByDottedPath,
  DottedPathPathToTuple,
} from './types/access-type-object-property-by-dotted-path.type';
import { ResourceWithParamsOrParamsFn } from './types/resource-with-params-or-params-fn.type';

declare const __QueryBrandSymbol: unique symbol;
type QueryBrand = {
  [__QueryBrandSymbol]: unknown;
};

type WithQueryOutputStoreConfig<
  ResourceName,
  ResourceState extends object | undefined
> = {
  state: {};
  props: Merge<
    {
      [key in ResourceName & string]: ResourceRef<ResourceState>;
    },
    {
      __query: {
        [key in ResourceName & string]: ResourceState;
      };
    }
  >;
  methods: {};
};

export function query<
  queryState extends object | undefined,
  queryParams,
  QueryArgsParams,
  Input extends SignalStoreFeatureResult,
  const StoreInput extends Prettify<
    StateSignals<Input['state']> &
      Input['props'] &
      Input['methods'] &
      WritableStateSource<Prettify<Input['state']>>
  >
>(
  queryConfig: ResourceWithParamsOrParamsFn<
    queryState,
    queryParams,
    QueryArgsParams
  >,
  clientState?: (
    /**
     * Only used to help type inference, not used in the actual implementation.
     */
    config: {
      state: NoInfer<queryState>;
      params: NoInfer<queryParams>;
    },
    /**
     * Only used to help type inference, not used in the actual implementation.
     */
    context: Input
  ) => {
    clientState?: {
      path?: string;
      mapResourceToState?: MapResourceToState<
        NoInfer<queryState>,
        NoInfer<queryParams>,
        any
      >;
    };
  }
): (
  store: StoreInput,
  context: Input
) => {
  queryConfig: ResourceWithParamsOrParamsFn<
    NoInfer<queryState>,
    NoInfer<queryParams>,
    NoInfer<QueryArgsParams>
  >;
  clientState?: {
    path: string;
    mapResourceToState?: MapResourceToState<
      NoInfer<queryState>,
      NoInfer<queryParams>,
      any
    >;
  };
  /**
   * Only used to help type inference, not used in the actual implementation.
   */
  __types: {
    queryState: NoInfer<queryState>;
    queryParams: NoInfer<queryParams>;
    queryArgsParams: NoInfer<QueryArgsParams>;
  };
} {
  return (store, context) => ({
    queryConfig,
    // clientState params are only used to help type inference
    clientState: clientState?.({} as any, {} as any).clientState as any,
    __types: {
      queryState: {} as NoInfer<queryState>,
      queryParams: {} as NoInfer<queryParams>,
      queryArgsParams: {} as NoInfer<QueryArgsParams>,
    },
  });
}

export function withQuery<
  Input extends SignalStoreFeatureResult,
  const ResourceName extends string,
  ResourceState extends object | undefined,
  ResourceParams,
  ResourceArgsParams,
  QueryConfig extends ResourceWithParamsOrParamsFn<any, any, any>,
  const StoreInput extends Prettify<
    StateSignals<Input['state']> &
      Input['props'] &
      Input['methods'] &
      WritableStateSource<Prettify<Input['state']>>
  >
>(
  resourceName: ResourceName,
  queryFactory: (store: StoreInput) => (
    store: StoreInput,
    context: Input
  ) => { queryConfig: QueryConfig } & {
    clientState?: {
      path: string;
      mapResourceToState?: MapResourceToState<any, any, any>;
    };
  } & {
    __types: {
      queryState: ResourceState;
      queryParams: ResourceParams;
      queryArgsParams: ResourceArgsParams;
    };
  }
): SignalStoreFeature<
  Input,
  WithQueryOutputStoreConfig<ResourceName, ResourceState>
> {
  return ((context: SignalStoreFeatureResult) => {
    return signalStoreFeature(
      withProps((store) => {
        const queryConfigData = queryFactory(store as unknown as StoreInput)(
          store as unknown as StoreInput,
          context as unknown as Input
        );
        const queryResourceParamsFnSignal = signal<ResourceParams | undefined>(
          undefined
        );

        const resourceParamsSrc =
          queryConfigData.queryConfig.params ?? queryResourceParamsFnSignal;

        const queryResource = resource<ResourceState, ResourceParams>({
          ...queryConfigData.queryConfig,
          params: resourceParamsSrc,
        } as ResourceOptions<any, any>);

        const clientState = queryConfigData.clientState;

        return {
          [resourceName]: queryResource,
          ...(clientState &&
            'path' in clientState && {
              [`_${resourceName}Effect`]: effect(() => {
                if (!['resolved', 'local'].includes(queryResource.status())) {
                  return;
                }
                patchState(store, (state) => {
                  const resourceData = queryResource.hasValue()
                    ? (queryResource.value() as ResourceState | undefined)
                    : undefined;
                  const path = clientState?.path;
                  const mappedResourceToState =
                    'mapResourceToState' in clientState
                      ? clientState.mapResourceToState({
                          queryResource,
                          queryParams:
                            queryResourceParamsFnSignal() as NonNullable<
                              NoInfer<ResourceParams>
                            >,
                        })
                      : resourceData;
                  const keysPath = (path as string).split('.');

                  return createNestedStateUpdate({
                    state,
                    keysPath,
                    value: mappedResourceToState,
                  });
                });
              }),
            }),
        };
      })
      //@ts-ignore
    )(context);
  }) as unknown as SignalStoreFeature<
    Input,
    WithQueryOutputStoreConfig<ResourceName, ResourceState>
  >;
}

type MapResourceToState<
  ResourceState,
  ResourceParams,
  ClientStateTypeByDottedPath
> = (queryData: {
  queryResource: ResourceRef<NoInfer<ResourceState>>;
  queryParams: NoInfer<ResourceParams>;
}) => NoInfer<ClientStateTypeByDottedPath>;

/**
 * Will update the state at the given path with the resource data.
 * If the type of targeted state does not match the type of the resource,
 * the mapResourceToState function is required.
 */
export function clientState<
  Input extends SignalStoreFeatureResult,
  ResourceState,
  ResourceParams,
  ResourceArgsParams,
  QueryConfig extends {
    state: ResourceState;
    params: ResourceParams;
  },
  const ClientStateDottedPath extends ObjectDeepPath<Input['state']>,
  const ClientStateTypeByDottedPath extends AccessTypeObjectPropertyByDottedPath<
    Input['state'],
    ClientStateDottedPathTuple
  >,
  const ClientStateDottedPathTuple extends DottedPathPathToTuple<
    ClientStateDottedPath & string
  > = DottedPathPathToTuple<ClientStateDottedPath & string>
>(
  clientState: Prettify<
    MergeObject<
      {
        path: ClientStateDottedPath;
        mapResourceToState?: MapResourceToState<
          NoInfer<QueryConfig['state']>,
          NoInfer<QueryConfig['params']>,
          ClientStateTypeByDottedPath
        >;
      },
      NoInfer<QueryConfig['state']> extends ClientStateTypeByDottedPath
        ? {
            mapResourceToState?: MapResourceToState<
              NoInfer<QueryConfig['state']>,
              NoInfer<QueryConfig['params']>,
              ClientStateTypeByDottedPath
            >;
          }
        : {
            mapResourceToState: MapResourceToState<
              NoInfer<QueryConfig['state']>,
              NoInfer<QueryConfig['params']>,
              ClientStateTypeByDottedPath
            >;
          }
    >
  >
) {
  return (queryConfig: QueryConfig, context: Input) => ({
    clientState,
  });
}

type User = {
  id: string;
  name: string;
  email: string;
};
