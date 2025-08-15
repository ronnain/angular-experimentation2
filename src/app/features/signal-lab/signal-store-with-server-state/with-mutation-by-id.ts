import {
  effect,
  EffectRef,
  inject,
  Injector,
  linkedSignal,
  ResourceRef,
  ResourceStatus,
  Signal,
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
import {
  OptimisticPathMutationQuery,
  ReloadQueriesConfig,
  QueryAndMutationRecordConstraints,
  FilterQueryById,
  OptimisticPatchQueryFn,
  CustomReloadOnSpecificMutationStatus,
} from './types/shared.type';
import {
  __InternalSharedMutationConfig,
  QueriesMutation,
} from './with-mutation';
import { ResourceByIdRef } from '../resource-by-id';
import {
  AssociatedStateMapperFnById,
  BooleanOrMapperFnByPathById,
} from './types/boolean-or-mapper-fn-by-path-by-id.type';
import { nestedEffect } from './types/util';
import {
  createNestedStateUpdate,
  getNestedStateValue,
} from './core/update-state.util';
import { triggerQueryReloadFromMutationChange } from './core/query.core';

export type MutationByIdRef<
  GroupIdentifier extends string | number,
  ResourceState,
  ResourceParams
> = {
  resourceById: ResourceByIdRef<GroupIdentifier, ResourceState>;
  resourceParamsSrc: Signal<ResourceParams | undefined>;
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
    queryIdentifier,
    queryResource,
    mutationResource,
    mutationParams,
  }: {
    queryIdentifier: NoInfer<
      QueryAndMutationRecord['query']['groupIdentifier']
    >;
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
  filter: FilterQueryById<QueryAndMutationRecord>;
};

/**
 *
 * @param resourceName
 * @param mutationFactory
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
export function withMutationById<
  Input extends SignalStoreFeatureResult,
  const ResourceName extends string,
  ResourceState extends object | undefined,
  ResourceParams,
  ResourceArgsParams,
  GroupIdentifier extends string | number,
  const StoreInput extends Prettify<
    StateSignals<Input['state']> &
      Input['props'] &
      Input['methods'] &
      WritableStateSource<Prettify<Input['state']>>
  >
>(
  resourceName: ResourceName,
  mutationFactory: (store: StoreInput) => (
    store: StoreInput,
    context: Input
  ) => {
    mutationByIdRef: MutationByIdRef<
      NoInfer<GroupIdentifier>,
      NoInfer<ResourceState>,
      NoInfer<ResourceParams>
    >;
  } & {
    __types: InternalType<
      ResourceState,
      ResourceParams,
      ResourceArgsParams,
      false,
      GroupIdentifier
    >;
  },
  queriesEffectsFn?: (
    store: StoreInput
  ) => QueriesMutation<
    Input,
    StoreInput,
    NoInfer<ResourceState>,
    NoInfer<ResourceParams>,
    NoInfer<ResourceArgsParams>,
    true,
    NoInfer<GroupIdentifier>
  >
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

        const queryConfigData = mutationFactory(store as unknown as StoreInput)(
          store as unknown as StoreInput,
          context as unknown as Input
        );

        const resourceParamsSrc =
          queryConfigData.mutationByIdRef.resourceParamsSrc;
        const queryResourcesById = queryConfigData.mutationByIdRef.resourceById;
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

        const mutationsConfigEffect = Object.entries(
          (queryOptions?.on ?? {}) as Record<
            string,
            QueryDeclarativeEffect<any>
          >
        );

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
              // todo add test for nestedEffect !
              if (!newResourceRefForNestedEffect()?.newKeys) {
                return;
              }
              newResourceRefForNestedEffect()?.newKeys.forEach(
                (incomingIdentifier) => {
                  nestedEffect(_injector, () => {
                    const queryResource =
                      queryResourcesById()[incomingIdentifier];

                    if (!queryResource) {
                      return;
                    }
                    const queryStatus = queryResource.status();
                    const queryValue = queryResource.value(); // track also the value
                    untracked(() => {
                      if (!['resolved', 'local'].includes(queryStatus)) {
                        return;
                      }
                      updateAssociatedClientStates<
                        ResourceState,
                        ResourceParams,
                        GroupIdentifier
                      >({
                        associatedClientStates,
                        store,
                        queryResource,
                        resourceParamsSrc,
                        incomingIdentifier,
                        queryResourcesById,
                      });
                    });
                  });
                }
              );
            }),
          }),
          ...(mutationsConfigEffect.length &&
            mutationsConfigEffect.reduce(
              (acc, [mutationName, mutationEffectOptions]) => {
                return {
                  ...acc,
                  [`_on${mutationName}${resourceName}QueryEffect`]: effect(
                    () => {
                      const mutationResource = (store as any)[
                        mutationName
                      ] as ResourceRef<any>;
                      const mutationStatus = mutationResource.status();
                      const mutationParamsSrc = (store as any)['__mutation'][
                        mutationName
                      ].paramsSource as Signal<any>;
                      // use to track the value of the mutation
                      const mutationValueChanged = mutationResource.hasValue()
                        ? mutationResource.value()
                        : undefined;

                      if (mutationEffectOptions?.optimisticUpdate) {
                        untracked(() => {
                          setOptimisticUpdateFromMutationOnQueryValue<ResourceParams>(
                            {
                              mutationStatus,
                              queryResourcesById,
                              mutationEffectOptions,
                              mutationResource,
                              mutationParamsSrc,
                            }
                          );
                        });
                      }
                      const reloadCConfig = mutationEffectOptions.reload;
                      if (reloadCConfig) {
                        untracked(() => {
                          triggerQueryReloadOnMutationStatusChange<ResourceState>(
                            {
                              mutationStatus,
                              queryResourcesById,
                              mutationEffectOptions,
                              mutationResource,
                              mutationParamsSrc,
                              reloadCConfig,
                            }
                          );
                        });
                      }
                      if (mutationEffectOptions.optimisticPatch) {
                        untracked(() => {
                          setOptimisticPatchFromMutationOnQueryValue<
                            ResourceState,
                            ResourceParams,
                            ResourceArgsParams
                          >({
                            mutationStatus,
                            queryResourcesById,
                            mutationEffectOptions,
                            mutationResource,
                            mutationParamsSrc,
                          });
                        });
                      }
                    }
                  ),
                };
              },
              {} as Record<`_on${string}${ResourceName}QueryEffect`, EffectRef>
            )),
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
function triggerQueryReloadOnMutationStatusChange<
  ResourceState extends object | undefined
>({
  mutationStatus,
  queryResourcesById,
  mutationEffectOptions,
  mutationResource,
  mutationParamsSrc,
  reloadCConfig,
}: {
  mutationStatus: string;
  queryResourcesById: ResourceByIdRef<string | number, ResourceState>;
  mutationEffectOptions: QueryDeclarativeEffect<any>;
  mutationResource: ResourceRef<any>;
  mutationParamsSrc: Signal<any>;
  reloadCConfig: {
    onMutationError?: boolean | CustomReloadOnSpecificMutationStatus<any>;
    onMutationResolved?: boolean | CustomReloadOnSpecificMutationStatus<any>;
    onMutationLoading?: boolean | CustomReloadOnSpecificMutationStatus<any>;
  };
}) {
  if (
    (['error', 'loading', 'resolved'] satisfies ResourceStatus[]).includes(
      mutationStatus as any
    )
  ) {
    Object.entries(
      queryResourcesById() as Record<string | number, ResourceRef<any>>
    )
      .filter(([queryIdentifier, queryResource]) => {
        return mutationEffectOptions.filter({
          queryIdentifier,
          queryResource,
          mutationResource,
          mutationParams: mutationParamsSrc(),
        });
      })
      .forEach(([queryIdentifier, queryResource]) => {
        triggerQueryReloadFromMutationChange<ResourceState>({
          reload: reloadCConfig,
          mutationStatus,
          queryResource,
          mutationResource,
          mutationParamsSrc,
        });
      });
  }
}

function setOptimisticPatchFromMutationOnQueryValue<
  ResourceState extends object | undefined,
  ResourceParams,
  ResourceArgsParams
>({
  mutationStatus,
  queryResourcesById,
  mutationEffectOptions,
  mutationResource,
  mutationParamsSrc,
}: {
  mutationStatus: string;
  queryResourcesById: ResourceByIdRef<string | number, ResourceState>;
  mutationEffectOptions: QueryDeclarativeEffect<any>;
  mutationResource: ResourceRef<any>;
  mutationParamsSrc: Signal<any>;
}) {
  if (mutationStatus === 'loading') {
    Object.entries(
      queryResourcesById() as Record<string | number, ResourceRef<any>>
    )
      .filter(([queryIdentifier, queryResource]) =>
        mutationEffectOptions.filter({
          queryIdentifier,
          queryResource,
          mutationResource,
          mutationParams: mutationParamsSrc(),
        })
      )
      .forEach(([queryIdentifier, queryResource]) => {
        Object.entries(
          mutationEffectOptions.optimisticPatch as Record<
            string,
            OptimisticPatchQueryFn<
              any,
              ResourceState,
              ResourceParams,
              ResourceArgsParams,
              any
            >
          >
        ).forEach(([path, optimisticPatch]) => {
          const queryValue = queryResource.hasValue()
            ? queryResource.value()
            : undefined;
          const optimisticValue = optimisticPatch({
            mutationResource,
            queryResource,
            mutationParams: mutationParamsSrc() as NonNullable<
              NoInfer<ResourceParams>
            >,
            targetedState: getNestedStateValue({
              state: queryValue,
              keysPath: path.split('.'),
            }),
          });
          const updatedValue = createNestedStateUpdate({
            state: queryValue,
            keysPath: path.split('.'),
            value: optimisticValue,
          });
          queryResource.set(updatedValue);
        });
      });
  }
}

function setOptimisticUpdateFromMutationOnQueryValue<ResourceParams>({
  mutationStatus,
  queryResourcesById,
  mutationEffectOptions,
  mutationResource,
  mutationParamsSrc,
}: {
  mutationStatus: string;
  queryResourcesById: ResourceByIdRef<string | number, any>;
  mutationEffectOptions: QueryDeclarativeEffect<any>;
  mutationResource: ResourceRef<any>;
  mutationParamsSrc: Signal<any>;
}) {
  if (mutationStatus === 'loading') {
    Object.entries(
      queryResourcesById() as Record<string | number, ResourceRef<any>>
    )
      .filter(([queryIdentifier, queryResource]) =>
        mutationEffectOptions.filter({
          queryIdentifier,
          queryResource,
          mutationResource,
          mutationParams: mutationParamsSrc(),
        })
      )
      .forEach(([queryIdentifier, queryResource]) => {
        const updatedValue = mutationEffectOptions.optimisticUpdate!({
          queryIdentifier,
          queryResource,
          mutationResource,
          mutationParams: mutationParamsSrc() as NonNullable<
            NoInfer<ResourceParams>
          >,
        });
        queryResource.set(updatedValue);
      });
  }
}

function updateAssociatedClientStates<
  ResourceState extends object | undefined,
  ResourceParams,
  GroupIdentifier extends string | number
>({
  associatedClientStates,
  store,
  queryResource,
  resourceParamsSrc,
  incomingIdentifier,
  queryResourcesById,
}: {
  associatedClientStates: [
    string,
    (
      | boolean
      | AssociatedStateMapperFnById<
          ResourceState,
          ResourceParams,
          unknown,
          GroupIdentifier
        >
    )
  ][];
  store: WritableStateSource<any>;
  queryResource: ResourceRef<NoInfer<ResourceState>>;
  resourceParamsSrc: Signal<NoInfer<ResourceParams> | undefined>;
  incomingIdentifier: GroupIdentifier;
  queryResourcesById: ResourceByIdRef<
    NoInfer<GroupIdentifier>,
    NoInfer<ResourceState>
  >;
}) {
  associatedClientStates.forEach(([path, associatedClientState]) => {
    patchState(store, (state) => {
      const resourceData = queryResource.hasValue()
        ? (queryResource.value() as ResourceState | undefined)
        : undefined;
      const value =
        typeof associatedClientState === 'boolean'
          ? resourceData
          : associatedClientState({
              queryResource: queryResource as ResourceRef<ResourceState>,
              //todo improve warn: it have a desynchronisation resourceParamsSrc() may change to fast and params will be for another queryById resource
              queryParams: resourceParamsSrc() as NonNullable<
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
  });
}
