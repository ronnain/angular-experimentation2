import {
  EffectRef,
  ResourceOptions,
  ResourceRef,
  Signal,
  effect,
  resource,
  signal,
  untracked,
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
import { InternalType, MergeObject } from './types/util.type';
import { Merge } from '../../../util/types/merge';
import {
  createNestedStateUpdate,
  getNestedStateValue,
} from './core/update-state.util';
import { ObjectDeepPath } from './types/object-deep-path-mapper.type';
import {
  AccessTypeObjectPropertyByDottedPath,
  DottedPathPathToTuple,
} from './types/access-type-object-property-by-dotted-path.type';
import { ResourceWithParamsOrParamsFn } from './types/resource-with-params-or-params-fn.type';
import {
  OptimisticPathMutationQuery,
  ReloadQueriesConfig,
  QueryAndMutationRecordConstraints,
  OptimisticPatchQueryFn,
} from './types/shared.type';
import { __InternalSharedMutationConfig } from './with-mutation';
import { ResourceByIdConfig } from './types/resource-by-id-config.type';
import { resourceById, ResourceByIdRef } from '../resource-by-id';

const __QueryBrandSymbol: unique symbol = Symbol();
type QueryBrand = {
  [__QueryBrandSymbol]: unknown;
};

// TODO find a way to access to a resourceRef without userQueryById() because it will be updated each time the query is updated

type WithQueryByIdOutputStoreConfig<
  ResourceName,
  ResourceState extends object | undefined,
  ResourceParams,
  ResourceArgsParams,
  GroupIdentifier extends string | number
> = {
  state: {};
  props: Merge<
    {
      [key in `${ResourceName & string}QueryById`]: ResourceByIdRef<
        GroupIdentifier,
        ResourceState
      >;
    },
    {
      __query: {
        [key in ResourceName & string]: Prettify<
          InternalType<
            ResourceState,
            ResourceParams,
            ResourceArgsParams,
            true,
            GroupIdentifier
          >
        >;
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

type QueryDeclarativeEffect<
  QueryAndMutationRecord extends QueryAndMutationRecordConstraints
> = {
  optimisticUpdate?: ({
    queryResource,
    mutationResource,
    mutationParams,
  }: {
    queryResource: ResourceRef<QueryAndMutationRecord['query']['state']>;
    mutationResource: ResourceRef<QueryAndMutationRecord['mutation']['state']>;
    mutationParams: NoInfer<QueryAndMutationRecord['mutation']['params']>;
  }) => NoInfer<QueryAndMutationRecord['query']['state']>;
  reload?: ReloadQueriesConfig<QueryAndMutationRecord>;
  /**
   * Will patch the query specific state with the mutation data.
   * If the query is loading, it will not patch.
   * If the mutation data is not compatible with the query state, it will not patch.
   * Be careful! If the mutation is already in a loading state, trigger the mutation again will cancelled the previous mutation loader and will patch with the new value.
   */
  optimisticPatch?: OptimisticPathMutationQuery<QueryAndMutationRecord>;
};

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
export function withQueryById<
  Input extends SignalStoreFeatureResult,
  const ResourceName extends string,
  ResourceState extends object | undefined,
  ResourceParams,
  ResourceArgsParams,
  GroupIdentifier extends string | number,
  QueryConfig extends ResourceByIdConfig<any, any, any, any>,
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
    __types: InternalType<
      ResourceState,
      ResourceParams,
      ResourceArgsParams,
      false,
      GroupIdentifier
    >;
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
    on?: Input['props'] extends {
      __mutation: infer Mutations;
    }
      ? {
          [key in keyof Mutations]?: Mutations[key] extends InternalType<
            infer MutationState,
            infer MutationParams,
            infer MutationArgsParams,
            infer MutationIsByGroup
          >
            ? QueryDeclarativeEffect<{
                query: InternalType<
                  ResourceState,
                  ResourceParams,
                  ResourceArgsParams,
                  false
                >;
                mutation: InternalType<
                  MutationState,
                  MutationParams,
                  MutationArgsParams,
                  MutationIsByGroup
                >;
              }>
            : never;
        }
      : never;
  }
): SignalStoreFeature<
  Input,
  WithQueryByIdOutputStoreConfig<
    ResourceName,
    ResourceState,
    ResourceParams,
    ResourceArgsParams,
    GroupIdentifier
  >
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

        const queryResource = resourceById<
          ResourceState,
          ResourceParams,
          GroupIdentifier
        >({
          ...queryConfigData.queryConfig,
          params: resourceParamsSrc,
        });

        const queryOptions = optionsFactory?.(store as unknown as StoreInput);

        const associatedClientState = queryOptions?.associatedClientState;

        const mutationsConfigEffect = Object.entries(
          (queryOptions?.on ?? {}) as Record<
            string,
            QueryDeclarativeEffect<any>
          >
        );

        return {
          [`${resourceName}QueryById`]: queryResource,
          // ...(associatedClientState &&
          //   'path' in associatedClientState && {
          //     [`_${resourceName}Effect`]: effect(() => {
          //       if (!['resolved', 'local'].includes(queryResource.status())) {
          //         return;
          //       }
          //       patchState(store, (state) => {
          //         const resourceData = queryResource.hasValue()
          //           ? (queryResource.value() as ResourceState | undefined)
          //           : undefined;
          //         const path = associatedClientState?.path;
          //         const mappedResourceToState =
          //           'mapResourceToState' in associatedClientState
          //             ? associatedClientState.mapResourceToState({
          //                 queryResource:
          //                   queryResource as ResourceRef<ResourceState>,
          //                 queryParams:
          //                   queryResourceParamsFnSignal() as NonNullable<
          //                     NoInfer<ResourceParams>
          //                   >,
          //               })
          //             : resourceData;
          //         const keysPath = (path as string).split('.');
          //         const result = createNestedStateUpdate({
          //           state,
          //           keysPath,
          //           value: mappedResourceToState,
          //         });
          //         return result;
          //       });
          //     }),
          //   }),
          // ...(mutationsConfigEffect.length &&
          //   mutationsConfigEffect.reduce(
          //     (acc, [mutationName, mutationEffectOptions]) => {
          //       return {
          //         ...acc,
          //         [`_on${mutationName}${resourceName}QueryEffect`]: effect(
          //           () => {
          //             const mutationResource = (store as any)[
          //               mutationName
          //             ] as ResourceRef<any>;
          //             const mutationStatus = mutationResource.status();
          //             const mutationParamsSrc = (store as any)['__mutation'][
          //               mutationName
          //             ].paramsSource as Signal<any>;

          //             if (mutationEffectOptions?.optimisticUpdate) {
          //               if (mutationStatus === 'loading') {
          //                 untracked(() => {
          //                   const optimisticValue =
          //                     mutationEffectOptions?.optimisticUpdate?.({
          //                       mutationResource,
          //                       queryResource,
          //                       mutationParams:
          //                         mutationParamsSrc() as NonNullable<
          //                           NoInfer<any>
          //                         >,
          //                     });
          //                   queryResource.set(optimisticValue);
          //                 });
          //               }
          //             }
          //             if (mutationEffectOptions.reload) {
          //               const statusMappings = {
          //                 onMutationError: 'error',
          //                 onMutationResolved: 'resolved',
          //                 onMutationLoading: 'loading',
          //               };

          //               Object.entries(mutationEffectOptions.reload).forEach(
          //                 ([reloadType, reloadConfig]) => {
          //                   const expectedStatus =
          //                     statusMappings[
          //                       reloadType as keyof typeof statusMappings
          //                     ];

          //                   if (
          //                     expectedStatus &&
          //                     mutationStatus === expectedStatus
          //                   ) {
          //                     if (typeof reloadConfig === 'function') {
          //                       if (
          //                         reloadConfig({
          //                           queryResource,
          //                           mutationResource,
          //                           mutationParams: untracked(() =>
          //                             mutationParamsSrc()
          //                           ) as any,
          //                         })
          //                       ) {
          //                         queryResource.reload();
          //                       }
          //                     } else if (reloadConfig) {
          //                       queryResource.reload();
          //                     }
          //                   }
          //                 }
          //               );
          //             }
          //             if (mutationEffectOptions.optimisticPatch) {
          //               if (mutationStatus === 'loading') {
          //                 untracked(() => {
          //                   Object.entries(
          //                     mutationEffectOptions.optimisticPatch as Record<
          //                       string,
          //                       OptimisticPatchQueryFn<
          //                         any,
          //                         ResourceState,
          //                         ResourceParams,
          //                         ResourceArgsParams,
          //                         any
          //                       >
          //                     >
          //                   ).forEach(([path, optimisticPatch]) => {
          //                     const queryValue = queryResource.hasValue()
          //                       ? queryResource.value()
          //                       : undefined;
          //                     console.log('queryValue', queryValue);
          //                     console.log(
          //                       'nestedValue',
          //                       getNestedStateValue({
          //                         state: queryValue,
          //                         keysPath: path.split('.'),
          //                       })
          //                     );
          //                     console.log(
          //                       'mutationParamsSrc()',
          //                       mutationParamsSrc()
          //                     );
          //                     const optimisticValue = optimisticPatch({
          //                       mutationResource,
          //                       queryResource,
          //                       mutationParams:
          //                         mutationParamsSrc() as NonNullable<
          //                           NoInfer<ResourceParams>
          //                         >,
          //                       targetedState: getNestedStateValue({
          //                         state: queryValue,
          //                         keysPath: path.split('.'),
          //                       }),
          //                     });
          //                     console.log('optimisticValue', optimisticValue);

          //                     const updatedValue = createNestedStateUpdate({
          //                       state: queryValue,
          //                       keysPath: path.split('.'),
          //                       value: optimisticValue,
          //                     });
          //                     queryResource.set(updatedValue);
          //                   });
          //                 });
          //               }
          //             }
          //           }
          //         ),
          //       };
          //     },
          //     {} as Record<`_on${string}${ResourceName}QueryEffect`, EffectRef>
          //   )),
        };
      })
      //@ts-ignore
    )(context);
  }) as unknown as SignalStoreFeature<
    Input,
    WithQueryByIdOutputStoreConfig<
      ResourceName,
      ResourceState,
      ResourceParams,
      ResourceArgsParams,
      GroupIdentifier
    >
  >;
}

/**
 * Configures a query.
 * And optionally associates the query result to a client state.
 */
export function queryById<
  queryState extends object | undefined,
  queryParams,
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
  queryConfig: ResourceByIdConfig<
    queryState,
    queryParams,
    QueryArgsParams,
    QueryGroupIdentifier
  >
): (
  store: StoreInput,
  context: Input
) => {
  queryConfig: ResourceByIdConfig<
    NoInfer<queryState>,
    NoInfer<queryParams>,
    NoInfer<QueryArgsParams>,
    NoInfer<QueryGroupIdentifier>
  >;
  /**
   * Only used to help type inference, not used in the actual implementation.
   */
  __types: InternalType<
    NoInfer<queryState>,
    NoInfer<queryParams>,
    NoInfer<QueryArgsParams>,
    false,
    NoInfer<QueryGroupIdentifier>
  >;
} & QueryBrand {
  return (store, context) => ({
    queryConfig,
    __types: {} as InternalType<
      NoInfer<queryState>,
      NoInfer<queryParams>,
      NoInfer<QueryArgsParams>,
      false,
      NoInfer<QueryGroupIdentifier>
    >,
    [__QueryBrandSymbol]: undefined,
  });
}
