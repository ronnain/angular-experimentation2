import {
  effect,
  inject,
  Injector,
  linkedSignal,
  ResourceRef,
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
import { InternalType } from './types/util.type';
import { Merge } from '../../../util/types/merge';
import { ObjectDeepPath } from './types/object-deep-path-mapper.type';
import {
  AccessTypeObjectPropertyByDottedPath,
  DottedPathPathToTuple,
} from './types/access-type-object-property-by-dotted-path.type';
import {
  OptimisticPathMutationQuery,
  ReloadQueriesConfig,
  QueryAndMutationRecordConstraints,
} from './types/shared.type';
import { __InternalSharedMutationConfig } from './with-mutation';
import { ResourceByIdConfig } from './types/resource-by-id-config.type';
import { resourceById, ResourceByIdRef } from '../resource-by-id';
import {
  AssociatedStateMapperFnById,
  BooleanOrMapperFnByPathById,
} from './types/boolean-or-mapper-fn-by-path-by-id.type';
import { nestedEffect } from './types/util';
import { createNestedStateUpdate } from './core/update-state.util';

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
     * a function is required.
     * - If the function is requested without the real needs, you may declare deliberately the store as a parameter of the option factory.
     */
    state?: BooleanOrMapperFnByPathById<
      //todo continue
      NoInfer<Input>['state'],
      NoInfer<ResourceState>,
      NoInfer<ResourceParams>,
      NoInfer<GroupIdentifier>
    > extends infer BooleanOrMapperFnByPath
      ? {
          [Path in keyof BooleanOrMapperFnByPath]?: BooleanOrMapperFnByPath[Path];
        }
      : never;
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
        const _injector = inject(Injector);

        const queryConfigData = queryFactory(store as unknown as StoreInput)(
          store as unknown as StoreInput,
          context as unknown as Input
        );
        const queryResourceParamsFnSignal = signal<ResourceParams | undefined>(
          undefined
        );

        const resourceParamsSrc =
          queryConfigData.queryConfig.params ?? queryResourceParamsFnSignal;

        const queryResourcesById = resourceById<
          ResourceState,
          ResourceParams,
          GroupIdentifier
        >({
          ...queryConfigData.queryConfig,
          params: resourceParamsSrc,
        });

        const identifierFn = queryConfigData.queryConfig.identifier;

        const queryOptions = optionsFactory?.(store as unknown as StoreInput);

        const associatedClientStates = Object.entries(
          (queryOptions?.state ?? {}) as Record<
            string,
            | boolean
            | AssociatedStateMapperFnById<
                ResourceState,
                ResourceParams,
                unknown,
                GroupIdentifier
              >
          >
        ).filter(([, value]) => !!value);

        const newResourceRefForNestedEffect = linkedSignal<
          ResourceByIdRef<GroupIdentifier, ResourceState>,
          { newKeys: GroupIdentifier[] } | undefined
        >({
          source: queryResourcesById as any,
          computation: (currentSource, previous) => {
            if (!currentSource || !Object.keys(currentSource).length) {
              return undefined;
            }

            const currentKeys = Object.keys(currentSource) as GroupIdentifier[];
            const previousKeys = Object.keys(
              previous?.source || {}
            ) as GroupIdentifier[];

            // Find keys that exist in current but not in previous
            const newKeys = currentKeys.filter(
              (key) => !previousKeys.includes(key)
            );

            return newKeys.length > 0 ? { newKeys } : previous?.value;
          },
        });

        return {
          [`${resourceName}QueryById`]: queryResourcesById,
          ...(associatedClientStates.length && {
            [`_${resourceName}EffectById`]: effect(() => {
              console.log('EffectById');
              if (!newResourceRefForNestedEffect()?.newKeys) {
                return;
              }
              newResourceRefForNestedEffect()?.newKeys.forEach(
                (incomingIdentifier) => {
                  nestedEffect(_injector, () => {
                    console.log('NestedEffectById');
                    const incomingParams = resourceParamsSrc(); //! peut-être plus bon ! récupérer l'identifier avec les params associé

                    if (incomingParams === undefined) {
                      return;
                    }

                    const queryResource =
                      queryResourcesById()[incomingIdentifier];

                    if (!queryResource) {
                      return;
                    }

                    const queryStatus = queryResource.status();
                    if (!['resolved', 'local'].includes(queryStatus)) {
                      return;
                    }
                    untracked(() => {
                      associatedClientStates.forEach(
                        ([path, associatedClientState]) => {
                          patchState(store, (state) => {
                            const resourceData = queryResource.hasValue()
                              ? (queryResource.value() as
                                  | ResourceState
                                  | undefined)
                              : undefined;
                            const value =
                              typeof associatedClientState === 'boolean'
                                ? resourceData
                                : associatedClientState({
                                    queryResource:
                                      queryResource as ResourceRef<ResourceState>,
                                    queryParams:
                                      queryResourceParamsFnSignal() as NonNullable<
                                        NoInfer<ResourceParams>
                                      >,
                                    queryIdentifier: incomingIdentifier,
                                    queryResources: queryResourcesById,
                                  });
                            const keysPath = (path as string).split('.');
                            const result = createNestedStateUpdate({
                              state,
                              keysPath,
                              value,
                            });
                            return result;
                          });
                        }
                      );
                    });
                  });
                }
              );
            }),
          }),
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
