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
  Store
>(
  queryResourceConfig: ResourceWithParamsOrParamsFn<
    queryState,
    queryParams,
    QueryArgsParams
  >,
  clientState: (config: {
    state: NoInfer<queryState>
    params: NoInfer<queryParams>;
  }) => {
    test: any;
    clientState?: {
      /**
       * Will update the state at the given path with the resource data.
       * If the state associated to the path does not exist, it will be created.
       */
      clientStatePath?: string;
      mapResourceToState?: (data: unknown) => any;
    }
  }
): ResourceWithParamsOrParamsFn<queryState, queryParams, QueryArgsParams> {
  return queryResourceConfig as ResourceWithParamsOrParamsFn<
    queryState,
    queryParams,
    QueryArgsParams
  >;
}

export function withQuery<
  Input extends SignalStoreFeatureResult,
  const ResourceName extends string,
  const ClientStateDottedPath extends ObjectDeepPath<Input['state']>,
  ResourceState extends object | undefined,
  ResourceParams,
  ResourceArgsParams,
  const StoreInput extends Prettify<
    StateSignals<Input['state']> &
      Input['props'] &
      Input['methods'] &
      WritableStateSource<Prettify<Input['state']>>
  >,
  QueryConfig extends ResourceWithParamsOrParamsFn<
  ResourceState,
  ResourceParams,
  ResourceArgsParams
>
  const ClientStateTypeByDottedPath extends AccessTypeObjectPropertyByDottedPath<
    Input['state'],
    ClientStateDottedPathTuple
  >,
  const ClientStateDottedPathTuple extends DottedPathPathToTuple<
    ClientStateDottedPath & string
  > = DottedPathPathToTuple<ClientStateDottedPath & string>
>(
  resourceName: ResourceName,
  queryFactory: (
    store: StoreInput
  ) => QueryConfig,
  query2: (store: NoInfer<ResourceWithParamsOrParamsFn<
    ResourceState,
    ResourceParams,
    ResourceArgsParams
  >>) => {
    clientState?: MergeObject<
      {
        /**
         * Will update the state at the given path with the resource data.
         * If the state associated to the path does not exist, it will be created.
         */
        clientStatePath: ClientStateDottedPath;
        mapResourceToState?: (data: {
          queryResource: ResourceRef<NoInfer<ResourceState>>;
          queryParams: NoInfer<ResourceParams>;
        }) => NoInfer<ClientStateTypeByDottedPath>;
      },
      NoInfer<ResourceState> extends ClientStateTypeByDottedPath
        ? {
            mapResourceToState?: (data: {
              queryResource: ResourceRef<NoInfer<ResourceState>>;
              queryParams: NoInfer<ResourceParams>;
            }) => NoInfer<ClientStateTypeByDottedPath>;
          }
        : {
            mapResourceToState: (data: {
              queryResource: ResourceRef<NoInfer<ResourceState>>;
              queryParams: NoInfer<ResourceParams>;
            }) => NoInfer<ClientStateTypeByDottedPath>;
          }
    >;
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

export function clientState<State extends object, InputStore extends WritableStateSource<State>,
ResourceState,
ResourceParams,
ResourceArgsParams,
QueryConfig extends {
  state: ResourceState;
  params: ResourceParams;
},
const ClientStateDottedPath extends ObjectDeepPath<InputStore>, // todo remove function ?
const ClientStateTypeByDottedPath extends AccessTypeObjectPropertyByDottedPath<
InputStore,
ClientStateDottedPathTuple
>,
const ClientStateDottedPathTuple extends DottedPathPathToTuple<
ClientStateDottedPath & string
> = DottedPathPathToTuple<ClientStateDottedPath & string>,
>(store: InputStore, queryConfig: QueryConfig, clientState: {
  test: NoInfer<QueryConfig['state']>;
  // clientState?: MergeObject<
  //   {
  //     /**
  //      * Will update the state at the given path with the resource data.
  //      * If the state associated to the path does not exist, it will be created.
  //      */
  //     clientStatePath: ClientStateDottedPath;
  //     mapResourceToState?: (data: {
  //       queryResource: ResourceRef<NoInfer<ResourceState>>;
  //       queryParams: NoInfer<ResourceParams>;
  //     }) => NoInfer<ClientStateTypeByDottedPath>;
  //   },
  //   NoInfer<ResourceState> extends ClientStateTypeByDottedPath
  //     ? {
  //         mapResourceToState?: (data: {
  //           queryResource: ResourceRef<NoInfer<ResourceState>>;
  //           queryParams: NoInfer<ResourceParams>;
  //         }) => NoInfer<ClientStateTypeByDottedPath>;
  //       }
  //     : {
  //         mapResourceToState: (data: {
  //           queryResource: ResourceRef<NoInfer<ResourceState>>;
  //           queryParams: NoInfer<ResourceParams>;
  //         }) => NoInfer<ClientStateTypeByDottedPath>;
  //       }
  // >;
}) {
  return  clientState
}

type User = {
  id: string;
  name: string;
  email: string;
};

