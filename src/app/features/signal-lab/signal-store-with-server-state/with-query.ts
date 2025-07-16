import { ResourceRef, effect, resource, signal } from '@angular/core';
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
import { Equal, Expect } from '../../../../../test-type';
import { lastValueFrom, of } from 'rxjs';

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
    config: {
      state: NoInfer<queryState>;
      params: NoInfer<queryParams>;
    },
    context: Input
  ) => {
    clientState?: {
      /**
       * Will update the state at the given path with the resource data.
       * If the state associated to the path does not exist, it will be created.
       */
      clientStatePath?: string;
      mapResourceToState?: (data: {
        queryResource: ResourceRef<NoInfer<queryState>>;
        queryParams: NoInfer<queryParams>;
      }) => any;
    };
  }
): (
  store: StoreInput,
  context: Input
) => {
  queryConfig: ResourceWithParamsOrParamsFn<
    queryState,
    queryParams,
    QueryArgsParams
  >;
  clientState?: {
    clientStatePath: string;
    mapResourceToState?: (data: {
      queryResource: ResourceRef<NoInfer<queryState>>;
      queryParams: NoInfer<queryParams>;
    }) => any;
  };
  __types: {
    queryState: NoInfer<queryState>;
    queryParams: NoInfer<queryParams>;
    queryArgsParams: NoInfer<QueryArgsParams>;
  };
} {
  return {
    queryConfig,
    clientState: clientState?.({} as any) as any,
    __types: {
      queryState: {} as NoInfer<queryState>,
      queryParams: {} as NoInfer<queryParams>,
      queryArgsParams: {} as NoInfer<QueryArgsParams>,
    },
  };
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
      clientStatePath: string;
      mapResourceToState?: (QuerymapResourceToState: {
        queryResource: ResourceRef<any>;
        queryParams: any;
      }) => any;
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
  return ((store: SignalStoreFeatureResult) => {
    const queryConfig = queryFactory(
      store as unknown as StateSignals<Input['state']> &
        Input['props'] &
        Input['methods'] &
        WritableStateSource<Prettify<Input['state']>>
    );
    const queryResourceParamsFnSignal = signal<ResourceParams | undefined>(
      undefined
    );

    const resourceParamsSrc =
      queryConfig.queryConfig.params?.(store as any) ??
      queryResourceParamsFnSignal;

    const queryResource = resource<ResourceState, ResourceParams>({
      ...queryConfig.queryConfig,
      params: resourceParamsSrc,
    } as any);

    return signalStoreFeature(
      withProps((store) => ({
        [resourceName]: resource,
        ...('clientStatePath' in queryConfig && {
          [`_${resourceName}Effect`]: effect(() => {
            if (!['resolved', 'local'].includes(queryResource.status())) {
              return;
            }
            patchState(store, (state) => {
              const resourceData = queryResource.hasValue()
                ? (queryResource.value() as ResourceState | undefined)
                : undefined;
              const clientStatePath = queryConfig.clientStatePath;
              const mappedResourceToState =
                'mapResourceToState' in queryConfig
                  ? queryConfig.mapResourceToState({
                      queryResource,
                      queryParams: queryResourceParamsFnSignal() as NonNullable<
                        NoInfer<ResourceParams>
                      >,
                    })
                  : resourceData;
              const keysPath = (clientStatePath as string).split('.');

              return createNestedStateUpdate({
                state,
                keysPath,
                value: mappedResourceToState,
              });
            });
          }),
        }),
      }))
      //@ts-ignore
    )(store);
  }) as unknown as SignalStoreFeature<
    Input,
    WithQueryOutputStoreConfig<ResourceName, ResourceState>
  >;
}

export function clientState<
  Input extends SignalStoreFeatureResult,
  ResourceState,
  ResourceParams,
  ResourceArgsParams,
  QueryConfig extends {
    state: ResourceState;
    params: ResourceParams;
  },
  const ClientStateDottedPath extends ObjectDeepPath<Input['state']>, // todo remove function ?
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
        /**
         * Will update the state at the given path with the resource data.
         * If the state associated to the path does not exist, it will be created.
         */
        path: ClientStateDottedPath;
        mapResourceToState?: (mapResourceToStateData: {
          queryResource: ResourceRef<NoInfer<QueryConfig['state']>>;
          queryParams: NoInfer<QueryConfig['params']>;
        }) => NoInfer<ClientStateTypeByDottedPath>;
      },
      NoInfer<QueryConfig['state']> extends ClientStateTypeByDottedPath
        ? {
            mapResourceToState?: (mapResourceToStateData: {
              queryResource: ResourceRef<NoInfer<QueryConfig['state']>>;
              queryParams: NoInfer<QueryConfig['params']>;
            }) => NoInfer<ClientStateTypeByDottedPath>;
          }
        : {
            mapResourceToState: (mapResourceToStateData: {
              queryResource: ResourceRef<NoInfer<QueryConfig['state']>>;
              queryParams: NoInfer<QueryConfig['params']>;
            }) => NoInfer<ClientStateTypeByDottedPath>;
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
