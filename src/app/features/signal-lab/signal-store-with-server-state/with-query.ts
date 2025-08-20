import {
  EffectRef,
  Injector,
  ResourceRef,
  Signal,
  effect,
  inject,
  linkedSignal,
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
  createNestedStateUpdate,
  getNestedStateValue,
} from './core/update-state.util';
import { OptimisticPatchQueryFn } from './types/shared.type';
import { __InternalSharedMutationConfig } from './with-mutation';
import {
  AssociatedStateMapperFn,
  BooleanOrMapperFnByPath,
} from './types/boolean-or-mapper-fn-by-path.type';
import {
  QueryDeclarativeEffect,
  setOptimisticPatchFromMutationOnQueryValue,
  setOptimisticUpdateFromMutationOnQueryValue,
  triggerQueryReloadFromMutationChange,
  triggerQueryReloadOnMutationStatusChange,
} from './core/query.core';
import { ResourceByIdRef } from '../resource-by-id';
import { nestedEffect } from './types/util';

export type QueryRef<ResourceState, ResourceParams> = {
  resource: ResourceRef<ResourceState | undefined>;
  resourceParamsSrc: Signal<ResourceParams | undefined>;
};

type WithQueryOutputStoreConfig<
  ResourceName,
  ResourceState extends object | undefined,
  ResourceParams,
  ResourceArgsParams,
  IsGroupedByGroup
> = {
  state: {};
  props: Merge<
    {
      [key in `${ResourceName & string}Query`]: ResourceRef<ResourceState>;
    },
    {
      __query: {
        [key in ResourceName & string]: Prettify<
          InternalType<
            ResourceState,
            ResourceParams,
            ResourceArgsParams,
            IsGroupedByGroup
          >
        >;
      };
    }
  >;
  methods: {};
};

/**
 *
 * @param resourceName
 * @param queryFactory
 * @param options To help for type inference, you may always get the store as a parameter. Otherwise the mapResourceToState may be requested without the real needs
 */
export function withQuery<
  Input extends SignalStoreFeatureResult,
  const ResourceName extends string,
  ResourceState extends object | undefined,
  ResourceParams,
  ResourceArgsParams,
  const StoreInput extends Prettify<
    StateSignals<Input['state']> &
      Input['props'] &
      Input['methods'] &
      WritableStateSource<Prettify<Input['state']>>
  >
>(
  resourceName: ResourceName,
  queryFactory: (store: NoInfer<StoreInput>) => (
    store: NoInfer<StoreInput>,
    context: Input
  ) => {
    queryRef: QueryRef<NoInfer<ResourceState>, NoInfer<ResourceParams>>;
  } & {
    __types: InternalType<
      ResourceState,
      ResourceParams,
      ResourceArgsParams,
      false
    >;
  },

  optionsFactory?: (store: NoInfer<StoreInput>) => {
    /**
     * Will update the state at the given path with the resource data.
     * If the type of targeted state does not match the type of the resource,
     * a function is required.
     * - If the function is requested without the real needs, you may declare deliberately the store as a parameter of the option factory.
     */
    associatedClientState?: BooleanOrMapperFnByPath<
      NoInfer<Input>['state'],
      NoInfer<ResourceState>,
      NoInfer<ResourceParams>
    > extends infer BooleanOrMapperFnByPath
      ? {
          [Path in keyof BooleanOrMapperFnByPath]?: BooleanOrMapperFnByPath[Path];
        }
      : never;
    on?: Input['props'] extends {
      __mutation: infer Mutations;
    }
      ? {
          [key in keyof Mutations as `${key &
            string}${'isGroupedResource' extends keyof Mutations[key]
            ? Mutations[key]['isGroupedResource'] extends true
              ? 'MutationById'
              : ''
            : never}`]?: Mutations[key] extends InternalType<
            infer MutationState,
            infer MutationParams,
            infer MutationArgsParams,
            infer MutationIsByGroup,
            infer MutationGroupIdentifier
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
                  MutationIsByGroup,
                  MutationGroupIdentifier
                >;
              }>
            : never;
        }
      : never;
  }
): SignalStoreFeature<
  Input,
  WithQueryOutputStoreConfig<
    ResourceName,
    ResourceState,
    ResourceParams,
    ResourceArgsParams,
    false
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

        const queryResourceParamsSrc =
          queryConfigData.queryRef.resourceParamsSrc;

        const queryResource = queryConfigData.queryRef.resource;

        const queryOptions = optionsFactory?.(store as unknown as StoreInput);

        const associatedClientStates = Object.entries(
          (queryOptions?.associatedClientState ?? {}) as Record<
            string,
            | boolean
            | AssociatedStateMapperFn<ResourceState, ResourceParams, unknown>
          >
        ).filter(([, value]) => !!value);

        const mutationsConfigEffect = Object.entries(
          (queryOptions?.on ?? {}) as Record<
            string,
            QueryDeclarativeEffect<any>
          >
        );

        return {
          [`${resourceName}Query`]: queryResource,

          ...(associatedClientStates.length && {
            [`_${resourceName}Effect`]: effect(() => {
              if (!['resolved', 'local'].includes(queryResource.status())) {
                return;
              }
              untracked(() =>
                updateAssociatedClientStates<ResourceState, ResourceParams>({
                  associatedClientStates,
                  store,
                  queryResource,
                  queryResourceParamsSrc,
                })
              );
            }),
          }),
          ...(mutationsConfigEffect.length &&
            mutationsConfigEffect.reduce(
              (acc, [mutationName, mutationEffectOptions]) => {
                const mutationTargeted = (store as any)[mutationName] as
                  | ResourceRef<any>
                  | ResourceByIdRef<string | number, any>;
                if ('hasValue' in mutationTargeted) {
                  const mutationResource = mutationTargeted as ResourceRef<any>;
                  return {
                    ...acc,
                    [`_on${mutationName}${resourceName}QueryEffect`]: effect(
                      () => {
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
                            setOptimisticUpdateFromMutationOnQueryValue({
                              mutationStatus,
                              queryResourceTarget: queryResource,
                              mutationEffectOptions,
                              mutationResource,
                              mutationParamsSrc,
                              mutationIdentifier: undefined,
                              mutationResources: undefined,
                            });
                          });
                        }
                        const reloadCConfig = mutationEffectOptions.reload;
                        if (reloadCConfig) {
                          untracked(() => {
                            triggerQueryReloadOnMutationStatusChange({
                              mutationStatus,
                              queryResourceTarget: queryResource,
                              mutationEffectOptions,
                              mutationResource,
                              mutationParamsSrc,
                              reloadCConfig,
                              mutationIdentifier: undefined,
                              mutationResources: undefined,
                            });
                          });
                        }
                        if (mutationEffectOptions.optimisticPatch) {
                          untracked(() => {
                            setOptimisticPatchFromMutationOnQueryValue({
                              mutationStatus,
                              queryResourceTarget: queryResource,
                              mutationEffectOptions,
                              mutationResource,
                              mutationParamsSrc,
                              mutationIdentifier: undefined,
                              mutationResources: undefined,
                            });
                          });
                        }
                      }
                    ),
                  };
                }
                const newMutationResourceRefForNestedEffect = linkedSignal<
                  ResourceByIdRef<string | number, ResourceState>,
                  { newKeys: (string | number)[] } | undefined
                >({
                  source: mutationTargeted as any,
                  computation: (currentSource, previous) => {
                    if (!currentSource || !Object.keys(currentSource).length) {
                      return undefined;
                    }

                    const currentKeys = Object.keys(currentSource) as (
                      | string
                      | number
                    )[];
                    const previousKeys = Object.keys(
                      previous?.source || {}
                    ) as (string | number)[];

                    // Find keys that exist in current but not in previous
                    const newKeys = currentKeys.filter(
                      (key) => !previousKeys.includes(key)
                    );

                    return newKeys.length > 0 ? { newKeys } : previous?.value;
                  },
                });

                return {
                  ...acc,
                  [`_on${mutationName}${resourceName}QueryEffect`]: effect(
                    () => {
                      if (!newMutationResourceRefForNestedEffect()?.newKeys) {
                        return;
                      }
                      newMutationResourceRefForNestedEffect()?.newKeys.forEach(
                        (mutationIdentifier) => {
                          nestedEffect(_injector, () => {
                            const mutationResource =
                              mutationTargeted()[mutationIdentifier];

                            if (!mutationResource) {
                              return;
                            }
                            const mutationStatus = mutationResource.status();
                            const mutationParamsSrc = (store as any)[
                              '__mutation'
                            ][mutationName].paramsSource as Signal<any>;
                            // use to track the value of the mutation
                            const mutationValueChanged =
                              mutationResource.hasValue()
                                ? mutationResource.value()
                                : undefined;

                            if (mutationEffectOptions?.optimisticUpdate) {
                              untracked(() => {
                                setOptimisticUpdateFromMutationOnQueryValue({
                                  mutationStatus,
                                  queryResourceTarget: queryResource,
                                  mutationEffectOptions,
                                  mutationResource,
                                  mutationParamsSrc,
                                  mutationIdentifier,
                                  mutationResources: mutationTargeted,
                                });
                              });
                            }
                            const reloadCConfig = mutationEffectOptions.reload;
                            if (reloadCConfig) {
                              untracked(() => {
                                triggerQueryReloadOnMutationStatusChange({
                                  mutationStatus,
                                  queryResourceTarget: queryResource,
                                  mutationEffectOptions,
                                  mutationResource,
                                  mutationParamsSrc,
                                  reloadCConfig,
                                  mutationIdentifier,
                                  mutationResources: mutationTargeted,
                                });
                              });
                            }
                            if (mutationEffectOptions.optimisticPatch) {
                              untracked(() => {
                                setOptimisticPatchFromMutationOnQueryValue({
                                  mutationStatus,
                                  queryResourceTarget: queryResource,
                                  mutationEffectOptions,
                                  mutationResource,
                                  mutationParamsSrc,
                                  mutationIdentifier: mutationIdentifier,
                                  mutationResources: mutationTargeted,
                                });
                              });
                            }
                          });
                        }
                      );
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
    WithQueryOutputStoreConfig<
      ResourceName,
      ResourceState,
      ResourceParams,
      ResourceArgsParams,
      false
    >
  >;
}

function optimisticUpdateQueryStateFromMutation<
  ResourceState extends object | undefined
>({
  mutationStatus,
  mutationEffectOptions,
  mutationResource,
  queryResource,
  mutationParamsSrc,
}: {
  mutationStatus: string;
  mutationEffectOptions: QueryDeclarativeEffect<any>;
  mutationResource: ResourceRef<any>;
  queryResource: ResourceRef<ResourceState | undefined>;
  mutationParamsSrc: Signal<any>;
}) {
  if (mutationStatus === 'loading') {
    const optimisticValue = mutationEffectOptions?.optimisticUpdate?.({
      mutationResource,
      queryResource,
      mutationParams: mutationParamsSrc() as NonNullable<NoInfer<any>>,
    });
    queryResource.set(optimisticValue);
  }
}

function updateAssociatedClientStates<
  ResourceState extends object | undefined,
  ResourceParams
>({
  associatedClientStates,
  store,
  queryResource,
  queryResourceParamsSrc,
}: {
  associatedClientStates: [
    string,
    boolean | AssociatedStateMapperFn<ResourceState, ResourceParams, unknown>
  ][];
  store: WritableStateSource<any>;
  queryResource: ResourceRef<ResourceState | undefined>;
  queryResourceParamsSrc: Signal<ResourceParams | undefined>;
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
              queryParams: queryResourceParamsSrc() as NonNullable<
                NoInfer<ResourceParams>
              >,
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
