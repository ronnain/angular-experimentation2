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
import { lastValueFrom, of } from 'rxjs';
import { rxResource } from '@angular/core/rxjs-interop';

const __QueryBrandSymbol: unique symbol = Symbol();
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
      [key in `${ResourceName & string}Query`]: ResourceRef<ResourceState>;
    },
    {
      __query: {
        [key in ResourceName & string]: ResourceState;
      };
    }
  >;
  methods: {};
};

type MapResourceToState<
  ResourceState,
  ResourceParams,
  ClientStateTypeByDottedPath
> = (queryData: {
  queryResource: ResourceRef<NoInfer<ResourceState>>;
  queryParams: NoInfer<ResourceParams>;
}) => NoInfer<ClientStateTypeByDottedPath>;

/**
 *
 * @param resourceName
 * @param queryFactory
 * @param options To help for type inference, you may always get the store as a parameter. Otherwise the mapResourceToState may be requested without the real needs
 * @example
 * ```ts
withQuery(
      'userDetails',
      (store) =>
        query(...),
      (store) => ({
        associatedClientState: {
          path: 'user',
        },
      })
    ),
 * ```
 * @returns
 */
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
  >,
  const ClientStateDottedPath extends ObjectDeepPath<Input['state']>,
  const ClientStateTypeByDottedPath extends AccessTypeObjectPropertyByDottedPath<
    Input['state'],
    ClientStateDottedPathTuple
  >,
  const ClientStateDottedPathTuple extends DottedPathPathToTuple<
    ClientStateDottedPath & string
  > = DottedPathPathToTuple<NoInfer<ClientStateDottedPath> & string>
>(
  resourceName: ResourceName,
  queryFactory: (store: StoreInput) => (
    store: StoreInput,
    context: Input
  ) => { queryConfig: QueryConfig } & {
    __types: {
      queryState: ResourceState;
      queryParams: ResourceParams;
      queryArgsParams: ResourceArgsParams;
    };
  } & QueryBrand,
  optionsFactory?: (store: StoreInput) => {
    // Exclude path from the MergeObject, it will enable the const type inference, otherwise it will be inferred as string
    /**
     * Will update the state at the given path with the resource data.
     * If the type of targeted state does not match the type of the resource,
     * the mapResourceToState function is required.
     * - If the mapResourceToState is requested without the real needs, you may declare deliberately the store as a parameter of the option factory.
     */
    associatedClientState?: { path: NoInfer<ClientStateDottedPath> } & Prettify<
      MergeObject<
        {
          mapResourceToState?: MapResourceToState<
            NoInfer<ResourceState>,
            NoInfer<ResourceParams>,
            ClientStateTypeByDottedPath
          >;
        },
        NoInfer<ResourceState> extends ClientStateTypeByDottedPath
          ? {
              mapResourceToState?: MapResourceToState<
                NoInfer<ResourceState>,
                NoInfer<ResourceParams>,
                ClientStateTypeByDottedPath
              >;
            }
          : {
              mapResourceToState: MapResourceToState<
                NoInfer<ResourceState>,
                NoInfer<ResourceParams>,
                ClientStateTypeByDottedPath
              >;
            }
      >
    >;
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

        const associatedClientState = optionsFactory?.(
          store as unknown as StoreInput
        ).associatedClientState;

        return {
          [`${resourceName}Query`]: queryResource,
          ...(associatedClientState &&
            'path' in associatedClientState && {
              [`_${resourceName}Effect`]: effect(() => {
                if (!['resolved', 'local'].includes(queryResource.status())) {
                  return;
                }
                patchState(store, (state) => {
                  const resourceData = queryResource.hasValue()
                    ? (queryResource.value() as ResourceState | undefined)
                    : undefined;
                  const path = associatedClientState?.path;
                  const mappedResourceToState =
                    'mapResourceToState' in associatedClientState
                      ? associatedClientState.mapResourceToState({
                          queryResource:
                            queryResource as ResourceRef<ResourceState>,
                          queryParams:
                            queryResourceParamsFnSignal() as NonNullable<
                              NoInfer<ResourceParams>
                            >,
                        })
                      : resourceData;
                  const keysPath = (path as string).split('.');
                  const result = createNestedStateUpdate({
                    state,
                    keysPath,
                    value: mappedResourceToState,
                  });
                  return result;
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

const testResource = resource({
  loader: () => lastValueFrom(of(5)),
  defaultValue: 0,
});

const testRxResource = rxResource<number, number>({
  // params: () => 5,
  stream: () => of(5),
});

/**
 * Configures a query.
 * And optionally associates the query result to a client state.
 */
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
} & QueryBrand {
  return (store, context) => ({
    queryConfig,
    // clientState params are only used to help type inference
    clientState: clientState?.({} as any, {} as any).clientState as any,
    __types: {
      queryState: {} as NoInfer<queryState>,
      queryParams: {} as NoInfer<queryParams>,
      queryArgsParams: {} as NoInfer<QueryArgsParams>,
    },
    [__QueryBrandSymbol]: undefined,
  });
}
