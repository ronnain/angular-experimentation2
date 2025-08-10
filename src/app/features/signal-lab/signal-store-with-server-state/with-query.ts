import {
  EffectRef,
  ResourceRef,
  Signal,
  effect,
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
import {
  OptimisticPathMutationQuery,
  ReloadQueriesConfig,
  QueryAndMutationRecordConstraints,
  OptimisticPatchQueryFn,
} from './types/shared.type';
import { __InternalSharedMutationConfig } from './with-mutation';
import {
  AssociatedStateMapperFn,
  BooleanOrMapperFnByPath,
} from './types/boolean-or-mapper-fn-by-path.type';
import { triggerQueryReloadFromMutationChange } from './core/query.core';

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
          [key in keyof Mutations]?: Mutations[key] extends InternalType<
            infer MutationState,
            infer MutationParams,
            infer MutationArgsParams,
            infer IsMutationGroupedResource,
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
                  IsMutationGroupedResource,
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

                      if (mutationEffectOptions?.optimisticUpdate) {
                        untracked(() => {
                          optimisticUpdateQueryStateFromMutation<ResourceState>(
                            {
                              mutationStatus,
                              mutationEffectOptions,
                              mutationResource,
                              queryResource,
                              mutationParamsSrc,
                            }
                          );
                        });
                      }
                      if (mutationEffectOptions.reload) {
                        triggerQueryReloadFromMutationChange<ResourceState>({
                          reload: mutationEffectOptions.reload,
                          mutationStatus,
                          queryResource,
                          mutationResource,
                          mutationParamsSrc,
                        });
                      }
                      if (mutationEffectOptions.optimisticPatch) {
                        if (mutationStatus === 'loading') {
                          untracked(() => {
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
                                mutationParams:
                                  mutationParamsSrc() as NonNullable<
                                    NoInfer<ResourceParams>
                                  >,
                                targetedState: getNestedStateValue({
                                  state: queryValue,
                                  keysPath: path.split('.'),
                                }),
                              });
                              console.log('optimisticValue', optimisticValue);

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
