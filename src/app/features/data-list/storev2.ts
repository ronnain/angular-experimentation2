import { InjectionToken } from '@angular/core';
import {
  groupBy,
  map,
  merge,
  mergeMap,
  Observable,
  of,
  OperatorFunction,
  scan,
  share,
  shareReplay,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs';
import { statedStream } from '../../util/stated-stream/stated-stream';

export type Operator = <T, R>(
  fn: (value: T) => Observable<R>
) => OperatorFunction<T, R>;

type MethodName = string;

export type IdSelector<TData> = (entity: TData) => string | number;

export type ReducerParams<TData, TContext, MethodName extends string> = {
  id: string | number;
  status: EntityStatus;
  entityWithStatus: EntityWithStatus<TData, MethodName>; // todo check why there is still status here ?
  entityIdSelector: IdSelector<TData>;
  context: TContext;
} & ContextualEntities<TData, MethodName>;

export type BulkReducerParams<TData, TContext, MethodName extends string> = {
  bulkEntities: EntityWithStatus<TData, MethodName>[];
  entityIdSelector: IdSelector<TData>;
  context: TContext;
} & ContextualEntities<TData, MethodName>;

type StatedData<T> = {
  readonly isLoading: boolean;
  readonly isLoaded: boolean;
  readonly hasError: boolean;
  readonly error: any;
  readonly result: T;
};

export type Reducer<TData, TContext, MethodName extends string> = (
  data: ReducerParams<TData, TContext, MethodName>
) => ContextualEntities<TData, MethodName>;

export type StatedDataReducer<TData, TContext, MethodName extends string> = {
  onLoading?: Reducer<TData, TContext, MethodName>;
  onLoaded?: Reducer<TData, TContext, MethodName>;
  onError?: Reducer<TData, TContext, MethodName>;
};

export type BulkReducer<TData, TContext, MethodName extends string> = (
  data: BulkReducerParams<TData, TContext, MethodName>
) => ContextualEntities<TData, MethodName>;

type BulkStatedDataReducer<TData, TContext, MethodName extends string> = {
  onLoading?: BulkReducer<TData, TContext, MethodName>;
  onLoaded?: BulkReducer<TData, TContext, MethodName>;
  onError?: BulkReducer<TData, TContext, MethodName>;
};

type StatedDataReducerWithoutOnLoading<
  TData,
  TContext,
  MethodName extends string
> = Omit<StatedDataReducer<TData, TContext, MethodName>, 'onLoading'>;

type BulkStatedDataReducerWithoutOnLoading<
  TData,
  TContext,
  MethodName extends string
> = Omit<BulkStatedDataReducer<TData, TContext, MethodName>, 'onLoading'>;

export type EntityStatus = Omit<StatedData<unknown>, 'result'>;
export type EntityWithStatus<TData, MethodName extends string> = {
  entity: TData;
  status: MethodStatus<MethodName>;
};
type EntityWithStatusWithSelectors<
  TData,
  MethodName extends string,
  TEntitySelectors
> = {
  entity: TData;
  status: MethodStatus<MethodName>;
  selectors: TEntitySelectors;
};
type MethodStatus<MethodName extends string> = Partial<
  Record<MethodName, EntityStatus>
>;

type EntityReducerConfig<TData, TContext, MethodName extends string> = {
  entityStatedData: StatedData<TData>;
  reducer: StatedDataReducer<TData, TContext, MethodName> | undefined;
  entityIdSelector: IdSelector<TData>;
};

type EntityStateByMethodObservable<TData, TContext> = Observable<
  Record<
    MethodName,
    {
      [x: string]: EntityReducerConfig<TData, TContext, MethodName>;
    }
  >
>[];

type BulkReducerConfig<TData, TContext, MethodName extends string> = {
  entitiesStatedData: StatedData<TData[]>;
  reducer: BulkStatedDataReducer<TData, TContext, MethodName> | undefined;
  entityIdSelector: IdSelector<TData>;
};

type BulkStateByMethodObservable<TData, TContext> = Observable<
  Record<MethodName, BulkReducerConfig<TData, TContext, MethodName>>
>[];

export type ContextualEntities<TData, MethodName extends string> = {
  entities: EntityWithStatus<TData, MethodName>[];
  outOfContextEntities: EntityWithStatus<TData, MethodName>[];
};

type StatedEntities<TData, MethodName extends string, TContext> = StatedData<
  ContextualEntities<TData, MethodName> & {
    context: TContext | undefined;
  }
>;

type StatedEntitiesWithSelectors<
  TData,
  MethodName extends string,
  TContext,
  TEntitySelectors,
  TStoreSelectors
> = StatedData<
  ContextualEntitiesWithSelectors<TData, MethodName, TEntitySelectors> & {
    context: TContext | undefined;
    selectors: TStoreSelectors;
  }
>;

type ContextualEntitiesWithSelectors<
  TData,
  MethodName extends string,
  TEntitySelectors
> = {
  entities: EntityWithStatusWithSelectors<
    TData,
    MethodName,
    TEntitySelectors
  >[];
  outOfContextEntities: EntityWithStatusWithSelectors<
    TData,
    MethodName,
    TEntitySelectors
  >[];
};

export type DelayedReducer<TData, TContext, MethodName extends string> = {
  reducer: StatedDataReducerWithoutOnLoading<TData, TContext, MethodName>;
  notifier: (events: any) => Observable<unknown>; // it can be used to removed an entity from the lists after a certain time or a certain trigger
};

type BulkDelayedReducer<TData, TContext, MethodName extends string> = {
  reducer: BulkStatedDataReducerWithoutOnLoading<TData, TContext, MethodName>;
  notifier: (events: any) => Observable<unknown>; // it can be used to removed an entity from the lists after a certain time or a certain trigger
};

export function entityLevelAction<TData>() {
  return <
    TSrc,
    TTargetSrc extends TSrc extends TData
      ? {}
      : {
          optimisticEntity: (actionContext: TSrc) => TData;
        }
  >(
    config: {
      src: () => Observable<TSrc>;
      api: (params: { data: TSrc }) => Observable<TData>;
      operator: Operator; // Use switchMap as default, mergeMap is not recommended
    } & TTargetSrc
  ) => config;
}

type EntitiesSource<TData, TEntitiesSrc, ActionNames extends string> =
  | {
      srcContext: Observable<TEntitiesSrc>;
      query: (srcContext: TEntitiesSrc) => Observable<TData[]>;
      initialData: TData[] | undefined;
    }
  | {
      srcContext: TData[];
    }
  | {
      srcContext: TData[];
      reducer: (
        srcContext: TEntitiesSrc
      ) => Observable<EntityWithStatus<TData, ActionNames>[]>;
    };

export function entitiesSource<TData, ActionNames extends string>() {
  return <TEntitiesSrc>(
    config: EntitiesSource<TData, TEntitiesSrc, ActionNames>
  ) => config;
}

export function bulkAction<TSrc, TData>(config: BulkActionConfig<TSrc, TData>) {
  return config;
}

export type EntityLevelActionConfig<TSrc, TData> = {
  src: () => Observable<TSrc>;
  api: (params: { data: TSrc }) => Observable<TData>;
  operator: Operator; // Use switchMap as default, mergeMap is not recommended
};

export type BulkActionConfig<TSrc, TData> = {
  src: () => Observable<TSrc>;
  api: (params: { data: TSrc }) => Observable<TData>;
  operator: Operator; // Use concatMap or exhaustMap as default (switchMap and mergeMap are not recommended), because, it ait is trigger a second time during the loading phase and if the list of the selected Id change, the removed selected id will be display as loading (it may be fixed)
};

type FinalResult<
  TData,
  TEntityLevelActionsKeys extends string,
  TContext,
  TEntitySelectors,
  TStoreSelectors
> = Observable<
  StatedEntitiesWithSelectors<
    TData,
    TEntityLevelActionsKeys,
    TContext,
    TEntitySelectors,
    TStoreSelectors
  >
>;

type Selectors<TData, MethodName extends string, TContext> = {
  entityLevel?: (
    params: EntityWithStatus<TData, MethodName> & {
      context: TContext | undefined;
    }
  ) => Record<string, unknown>;
  storeLevel?: (
    params: ContextualEntities<TData, MethodName> & {
      context: TContext | undefined;
    }
  ) => Record<string, unknown>;
};

// todo create a plug function, that will ensure that mutation api call are not cancelled if the store is destroyed
// todo improve the statedStream typing (make a result like {status: ..., result: ...})
// todo add events
// todo create a type helper function to ensure that ensure that the methods name union are the same
// todo try to integrate selector using a pipe method ?
// todo remove noinfer ?
// todo retry to pass the entityLevelSelector types to the store selectors
// todo add the possibility to add a src that are already a result and only needs to be merged with the current result

export const DataListStore = new InjectionToken('Store', {
  providedIn: 'root',
  factory: () => {
    return <TData, SrcContext, ActionNames extends string>() =>
      <
        TEntityLevelActionsKeys extends keyof TEntityLevelActions extends string
          ? keyof TEntityLevelActions
          : never,
        TEntityLevelActions extends Record<
          TEntityLevelActionsKeys,
          EntityLevelActionConfig<SrcContext, NoInfer<TData>>
        >,
        TBulkActionsKeys extends keyof TBulkActions extends string
          ? keyof TBulkActions
          : never,
        TBulkActions extends Record<
          TBulkActionsKeys,
          BulkActionConfig<SrcContext, NoInfer<TData[]>>
        >,
        TSelectors extends Selectors<
          TData,
          TEntityLevelActionsKeys | TBulkActionsKeys,
          SrcContext
        >,
        TReducer extends Partial<
          Record<
            TEntityLevelActionsKeys,
            StatedDataReducer<
              TData,
              SrcContext,
              TEntityLevelActionsKeys | TBulkActionsKeys
            >
          >
        >,
        TBulkReducer extends Partial<
          Record<
            TBulkActionsKeys,
            BulkStatedDataReducer<
              TData,
              SrcContext,
              TBulkActionsKeys | TEntityLevelActionsKeys
            >
          >
        >,
        TDelayedReducer extends Partial<
          Record<
            TEntityLevelActionsKeys,
            DelayedReducer<
              NoInfer<TData[]>,
              SrcContext,
              TEntityLevelActionsKeys | TBulkActionsKeys
            >[]
          >
        >,
        TBulkDelayedReducer extends Partial<
          Record<
            TBulkActionsKeys,
            BulkDelayedReducer<
              NoInfer<TData>,
              SrcContext,
              TBulkActionsKeys | TEntityLevelActionsKeys
            >[]
          >
        >
      >(data: {
        entitiesSrc: EntitiesSource<TData, SrcContext, ActionNames>;
        entityIdSelector: IdSelector<TData>; // used to know of to identify the entity
        entityLevelAction?: TEntityLevelActions; // action that will affect the targeted entity, they can be triggered concurrently
        reducer?: TReducer; // if not provided, it will update the entity in the list (entities or outOfContextEntities)
        bulkActions?: TBulkActions;
        bulkReducer?: TBulkReducer; // if not provided, it will update the entities in the list (entities or outOfContextEntities)
        bulkDelayedReducer?: TBulkDelayedReducer;
        delayedReducer?: TDelayedReducer;
        selectors?: TSelectors;
      }) => {
        // return {} as TBulkActionsKeys;
        const entityIdSelector = data.entityIdSelector;
        const events = {}; // todo

        const entityLevelActionList$: EntityStateByMethodObservable<
          TData,
          any
        > = Object.entries(
          (data.entityLevelAction ?? {}) as Record<
            string,
            EntityLevelActionConfig<any, TData>
          >
        ).reduce((acc, [methodName, groupByData]) => {
          const src$ = groupByData.src();
          const operatorFn = groupByData.operator;
          const api = groupByData.api;
          const reducer = data.reducer?.[methodName as TEntityLevelActionsKeys];
          const delayedReducer = (data.delayedReducer?.[
            methodName as TEntityLevelActionsKeys
          ] || []) as unknown as
            | DelayedReducer<TData, SrcContext, MethodName>[]
            | undefined; // todo check type

          const actionByEntity$: Observable<{
            [x: MethodName]: {
              entityStatedData: StatedData<TData>;
              reducer:
                | StatedDataReducer<TData, SrcContext, MethodName>
                | undefined;
              entityIdSelector: IdSelector<TData>;
            };
          }> = src$.pipe(
            groupBy((entity) => entityIdSelector(entity)),
            mergeMap((groupedEntityById$) => {
              return groupedEntityById$.pipe(
                operatorFn((entity) => {
                  return statedStream(api({ data: entity }), entity).pipe(
                    map((entityStatedData) => ({
                      [entityIdSelector(entity)]: {
                        entityStatedData,
                        reducer,
                        entityIdSelector,
                      } satisfies EntityReducerConfig<
                        TData,
                        SrcContext,
                        MethodName
                      >,
                    })),
                    switchMap((entityReducerConfigWithMethod) =>
                      connectAssociatedDelayedReducer$<
                        TData,
                        SrcContext,
                        MethodName
                      >({
                        entityReducerConfigWithMethod,
                        delayedReducer,
                        events,
                        entityIdSelector,
                      })
                    )
                  );
                })
              );
            })
          );

          return [
            ...acc,
            actionByEntity$.pipe(
              map((groupedEntityById) => ({
                [methodName]: groupedEntityById,
              }))
            ),
          ];
        }, [] as EntityStateByMethodObservable<TData, SrcContext>);

        const bulkActionsList$: BulkStateByMethodObservable<TData, any> =
          Object.entries(
            (data.bulkActions ?? {}) as Record<
              string,
              BulkActionConfig<any, TData>
            >
          ).reduce((acc, [methodName, groupByData]) => {
            const src$ = groupByData.src();
            const operatorFn = groupByData.operator;
            const api = groupByData.api;
            const reducer = data.bulkReducer?.[methodName as TBulkActionsKeys];
            const delayedReducer =
              data.bulkDelayedReducer?.[methodName as TBulkActionsKeys] || [];

            const bulkActions$ = src$.pipe(
              operatorFn((entities) => {
                return statedStream(api({ data: entities }), entities).pipe(
                  map(
                    (entitiesStatedData) =>
                      ({
                        entitiesStatedData,
                        reducer,
                        entityIdSelector,
                      } satisfies BulkReducerConfig<
                        TData,
                        SrcContext,
                        MethodName
                      >)
                  ),
                  switchMap((bulkReducerConfig) =>
                    bulkConnectAssociatedDelayedReducer$<
                      TData,
                      SrcContext,
                      MethodName
                    >({
                      bulkReducerConfig,
                      delayedReducer,
                      events,
                    })
                  )
                );
              })
            );

            return [
              ...acc,
              bulkActions$.pipe(
                map((bulkReducerConfig) => ({
                  [methodName]: bulkReducerConfig,
                }))
              ),
            ];
          }, [] as BulkStateByMethodObservable<TData, SrcContext>);

        const entitiesData$ = data.entitiesSrc.srcContext.pipe(
          switchMap((srcContextValue) =>
            statedStream(
              data.entitiesSrc.api(srcContextValue),
              data.entitiesSrc.initialData
            )
          ),
          share()
        );

        // I choose to merge the entitiesData$ and the entityLevelActionList$, that's enable to add some items even if entities are not loaded yet
        const finalResult: FinalResult<
          TData,
          TEntityLevelActionsKeys | TBulkActionsKeys,
          SrcContext,
          TSelectors['entityLevel'] extends Function
            ? ReturnType<TSelectors['entityLevel']>
            : undefined,
          TSelectors['storeLevel'] extends Function
            ? ReturnType<TSelectors['storeLevel']>
            : undefined
        > = merge(
          entitiesData$.pipe(
            map((entitiesData) => ({
              type: 'fetchedData' as const,
              data: entitiesData,
            }))
          ),
          ...bulkActionsList$.map(
            map((bulkActionList) => ({
              type: 'bulkAction' as const,
              data: bulkActionList,
            }))
          ),
          ...entityLevelActionList$.map(
            map((entityLevelActionList) => ({
              type: 'action' as const,
              data: entityLevelActionList,
            }))
          )
        ).pipe(
          withLatestFrom(data.entitiesSrc.srcContext),
          scan(
            (acc, [action, context]) => {
              if (action.type === 'fetchedData') {
                const areIncomingEntitiesLoaded = action.data.isLoaded;

                const incomingEntities = (action.data.result ?? []).map(
                  (entity) => {
                    const previousEntity =
                      acc.result.entities.find(
                        (entityData) =>
                          entityIdSelector(entityData.entity) ==
                          entityIdSelector(entity)
                      ) ??
                      acc.result.outOfContextEntities.find(
                        (entityData) =>
                          entityIdSelector(entityData.entity) ==
                          entityIdSelector(entity)
                      );
                    return {
                      id: entityIdSelector(entity),
                      entity,
                      status: {
                        ...previousEntity?.status,
                      } satisfies MethodStatus<
                        TEntityLevelActionsKeys | TBulkActionsKeys
                      >,
                    };
                  }
                );
                const incomingEntitiesWithMergedStatus = incomingEntities.length
                  ? incomingEntities
                  : acc.result.entities;

                const previousEntitiesWithStatus = areIncomingEntitiesLoaded
                  ? acc.result.entities.filter(
                      (entity) => Object.keys(entity.status).length > 0
                    )
                  : [];

                const outOfContextEntities = [
                  ...previousEntitiesWithStatus,
                  ...acc.result.outOfContextEntities,
                ].filter((outOfContextEntity) => {
                  return !incomingEntitiesWithMergedStatus.some(
                    (incomingEntity) =>
                      entityIdSelector(incomingEntity.entity) ==
                      entityIdSelector(outOfContextEntity.entity)
                  );
                });

                return {
                  ...acc,
                  ...action.data,
                  result: {
                    entities: incomingEntitiesWithMergedStatus,
                    outOfContextEntities,
                    context,
                  },
                };
              }
              if (action.type === 'action') {
                return applyActionOnEntities({
                  acc,
                  actionByEntity: action.data,
                  context,
                });
              }
              if (action.type === 'bulkAction') {
                return applyBulkActionOnEntities({
                  acc,
                  bulkAction: action.data,
                  context,
                });
              }
              return acc;
            },
            {
              error: undefined,
              hasError: false,
              isLoaded: false,
              isLoading: true,
              result: {
                entities: [],
                outOfContextEntities: [],
                context: undefined,
              },
            } satisfies StatedEntities<
              TData,
              TEntityLevelActionsKeys,
              SrcContext
            > as StatedEntities<
              TData,
              TEntityLevelActionsKeys | TBulkActionsKeys,
              SrcContext
            > // satisfies apply an as const effect
          ),
          applySelectors<
            TData,
            SrcContext,
            TEntityLevelActionsKeys | TBulkActionsKeys,
            TEntityLevelActions,
            TSelectors
          >(data.selectors), // apply selectors
          shareReplay(1)
        );

        return {
          data: finalResult,
        };
      };
  },
});

function applySelectors<
  TData,
  SrcContext,
  MethodKeys extends string,
  TEntityLevelActions extends Record<
    string,
    EntityLevelActionConfig<SrcContext, TData>
  >,
  TSelectors extends Selectors<TData, MethodKeys, SrcContext>
>(selectors?: TSelectors) {
  return map((acc: StatedEntities<TData, MethodKeys, SrcContext>) => ({
    ...acc,
    result: {
      ...acc.result,
      entities: acc.result.entities.map((entityData) => ({
        ...entityData,
        selectors: selectors?.entityLevel?.({
          ...entityData,
          context: acc.result.context,
        }) as TSelectors['entityLevel'] extends Function
          ? ReturnType<TSelectors['entityLevel']>
          : undefined,
      })),
      outOfContextEntities: acc.result.outOfContextEntities.map(
        (entityData) => ({
          ...entityData,
          selectors: selectors?.entityLevel?.({
            ...entityData,
            context: acc.result.context,
          }) as TSelectors['entityLevel'] extends Function
            ? ReturnType<TSelectors['entityLevel']>
            : undefined,
        })
      ),
      selectors: selectors?.storeLevel?.({
        context: acc.result.context,
        entities: acc.result.entities,
        outOfContextEntities: acc.result.outOfContextEntities,
      }) as TSelectors['storeLevel'] extends Function
        ? ReturnType<TSelectors['storeLevel']>
        : undefined,
    },
  }));
}

function applyActionOnEntities<TData, SrcContext, MethodName extends string>({
  acc,
  actionByEntity,
  context,
}: {
  acc: StatedEntities<TData, MethodName, SrcContext>;
  actionByEntity: Record<
    string,
    {
      [x: string]: EntityReducerConfig<TData, SrcContext, MethodName>;
    }
  >;
  context: SrcContext;
}): StatedEntities<TData, MethodName, SrcContext> {
  const methodName = Object.keys(actionByEntity)[0];
  const entityId = Object.keys(actionByEntity[methodName])[0];
  const {
    entityStatedData: { error, hasError, isLoaded, isLoading, result },
    reducer,
    entityIdSelector,
  } = actionByEntity[methodName][entityId];

  const incomingEntityValue = result;
  const previousEntityWithStatus =
    acc.result.entities?.find(
      (entityData) => entityIdSelector(entityData.entity) == entityId
    ) ??
    acc.result.outOfContextEntities?.find(
      (entityData) =>
        entityData.entity && entityIdSelector(entityData.entity) == entityId
    );
  const updatedEntityValue: TData | undefined = previousEntityWithStatus?.entity
    ? {
        ...previousEntityWithStatus.entity,
        ...incomingEntityValue,
      }
    : incomingEntityValue;

  const updatedEntity: EntityWithStatus<TData, MethodName> = {
    ...previousEntityWithStatus,
    entity: updatedEntityValue,
    status: {
      ...previousEntityWithStatus?.status,
      [methodName]: {
        isLoading,
        isLoaded,
        hasError,
        error,
      },
    } as MethodStatus<MethodName>,
  };
  const incomingMethodStatus: EntityStatus = {
    isLoading,
    isLoaded,
    hasError,
    error,
  };

  const customReducer = isLoading
    ? reducer?.onLoading
    : isLoaded
    ? reducer?.onLoaded
    : hasError
    ? reducer?.onError
    : undefined;

  if (!customReducer || !acc.result) {
    const isEntityInEntities = acc.result.entities?.some(
      (entityData) => entityIdSelector(entityData.entity) == entityId
    );
    const isEntityInOutOfContextEntities =
      acc.result.outOfContextEntities?.some(
        (entityData) => entityIdSelector(entityData.entity) == entityId
      );

    if (!isEntityInEntities && !isEntityInOutOfContextEntities) {
      return {
        ...acc,
        result: {
          ...acc.result,
          outOfContextEntities: [
            ...acc.result.outOfContextEntities,
            updatedEntity,
          ],
          context,
        },
      };
    }

    if (isEntityInEntities) {
      return {
        ...acc,
        result: {
          ...acc.result,
          entities: replaceEntityIn({
            entities: acc.result.entities,
            entityId,
            updatedEntity,
            entityIdSelector,
          }),
          outOfContextEntities: isEntityInOutOfContextEntities
            ? acc.result.outOfContextEntities.filter(
                (entity) =>
                  entity.entity && entityIdSelector(entity.entity) !== entityId
              )
            : acc.result.outOfContextEntities,
          context,
        },
      };
    }

    return {
      ...acc,
      result: {
        ...acc.result,
        outOfContextEntities: replaceEntityIn({
          entities: acc.result.outOfContextEntities,
          entityId,
          updatedEntity,
          entityIdSelector,
        }),
        context,
      },
    };
  }

  if (customReducer) {
    return {
      ...acc,
      result: {
        ...customReducer({
          entities: acc.result.entities,
          outOfContextEntities: acc.result.outOfContextEntities,
          entityWithStatus: updatedEntity,
          status: incomingMethodStatus,
          entityIdSelector,
          id: entityId,
          context,
        }),
        context,
      },
    };
  }

  return acc;
}

function applyBulkActionOnEntities<
  TData,
  SrcContext,
  MethodName extends string
>({
  acc,
  bulkAction,
  context,
}: {
  acc: StatedEntities<TData, MethodName, SrcContext>;
  bulkAction: Record<
    MethodName,
    BulkReducerConfig<TData, SrcContext, MethodName>
  >;
  context: SrcContext;
}): StatedEntities<TData, MethodName, SrcContext> {
  const methodName = Object.keys(bulkAction)[0] as MethodName;
  const {
    entitiesStatedData: { error, hasError, isLoaded, isLoading, result },
    reducer,
    entityIdSelector,
  } = bulkAction[methodName];

  const incomingEntitiesValue = result;
  const previousEntitiesWithStatus =
    acc.result.entities?.filter((entityData) =>
      incomingEntitiesValue.find(
        (selectedEntity) =>
          entityIdSelector(selectedEntity) ===
          entityIdSelector(entityData.entity)
      )
    ) ??
    acc.result.outOfContextEntities?.filter((entityData) =>
      incomingEntitiesValue.find(
        (selectedEntity) =>
          entityIdSelector(selectedEntity) ===
          entityIdSelector(entityData.entity)
      )
    );

  const updatedEntities: EntityWithStatus<TData, MethodName>[] =
    previousEntitiesWithStatus.map((previousEntityWithStatus) => {
      return {
        entity: {
          ...previousEntityWithStatus.entity,
          ...incomingEntitiesValue.find(
            (selectedEntity) =>
              entityIdSelector(selectedEntity) ===
              entityIdSelector(previousEntityWithStatus.entity)
          ),
        },
        status: {
          ...previousEntityWithStatus.status,
          [methodName]: {
            isLoading,
            isLoaded,
            hasError,
            error,
          },
        },
      };
    });

  const customReducer = (
    isLoading
      ? reducer?.onLoading
      : isLoaded
      ? reducer?.onLoaded
      : hasError
      ? reducer?.onError
      : undefined
  ) as BulkReducer<TData, SrcContext, MethodName> | undefined; // todo fix this type
  // debugger;
  if (!customReducer || !acc.result) {
    return {
      ...acc,
      result: {
        ...acc.result,
        entities: acc.result.entities.map((entityData) => {
          const updatedEntity = updatedEntities.find(
            (updatedEntity) =>
              entityIdSelector(updatedEntity.entity) ===
              entityIdSelector(entityData.entity)
          );
          if (updatedEntity) {
            return {
              ...entityData,
              entity: updatedEntity.entity,
              status: {
                ...entityData.status,
                [methodName]: updatedEntity.status[methodName],
              },
            };
          }
          return entityData;
        }),
        outOfContextEntities: acc.result.outOfContextEntities.map(
          (outOfContextEntityData) => {
            const updatedEntity = updatedEntities.find(
              (updatedEntity) =>
                entityIdSelector(updatedEntity.entity) ===
                entityIdSelector(outOfContextEntityData.entity)
            );
            if (updatedEntity) {
              return {
                ...outOfContextEntityData,
                entity: updatedEntity.entity,
                status: {
                  ...outOfContextEntityData.status,
                  [methodName]: updatedEntity.status[methodName],
                },
              };
            }
            return outOfContextEntityData;
          }
        ),
        context,
      },
    };
  }

  if (customReducer) {
    return {
      ...acc,
      result: {
        ...customReducer({
          bulkEntities: updatedEntities,
          outOfContextEntities: acc.result.outOfContextEntities,
          entities: acc.result.entities,
          entityIdSelector,
          context,
        }),
        context,
      },
    };
  }

  return acc;
}

function replaceEntityIn<TData, MethodName extends string>({
  entities,
  entityId,
  updatedEntity,
  entityIdSelector,
}: {
  entities: EntityWithStatus<TData, MethodName>[];
  entityId: string; // todo remove this field and use only the entityIdSelector
  updatedEntity: EntityWithStatus<TData, MethodName>;
  entityIdSelector: IdSelector<TData>;
}) {
  return entities?.map((entityData) => {
    if (entityIdSelector(entityData.entity) != entityId) {
      return entityData;
    }

    return updatedEntity;
  });
}

function connectAssociatedDelayedReducer$<
  TDataConnect,
  SrcContext,
  MethodName extends string
>({
  entityReducerConfigWithMethod,
  delayedReducer,
  entityIdSelector,
  events,
}: {
  entityReducerConfigWithMethod: Record<
    string,
    EntityReducerConfig<TDataConnect, SrcContext, MethodName>
  >;
  delayedReducer:
    | DelayedReducer<TDataConnect, SrcContext, MethodName>[]
    | undefined;
  entityIdSelector: IdSelector<TDataConnect>;
  events: any;
}) {
  const id = Object.keys(entityReducerConfigWithMethod)[0];
  const entityReducerConfig = entityReducerConfigWithMethod[id];
  const { isLoading, isLoaded, hasError } =
    entityReducerConfig.entityStatedData;
  if (isLoading) {
    return of(entityReducerConfigWithMethod);
  }
  if (isLoaded) {
    const onLoadedDelayedReducer$ =
      delayedReducer
        ?.filter(({ reducer }) => reducer.onLoaded)
        .map(({ reducer, notifier }) => {
          return notifier(events).pipe(
            map(() => ({
              [id as string | number]: {
                entityStatedData: entityReducerConfig.entityStatedData,
                reducer,
                entityIdSelector,
              } satisfies EntityReducerConfig<
                TDataConnect,
                SrcContext,
                MethodName
              >,
            }))
          );
        }) ?? [];
    return merge(of(entityReducerConfigWithMethod), ...onLoadedDelayedReducer$);
  }

  if (hasError) {
    const onErrorDelayedReducer$ =
      delayedReducer
        ?.filter(({ reducer }) => reducer.onError)
        .map(({ reducer, notifier }) => {
          return notifier(events).pipe(
            map(() => ({
              [id as string]: {
                entityStatedData: entityReducerConfig.entityStatedData,
                reducer,
                entityIdSelector,
              } satisfies EntityReducerConfig<
                TDataConnect,
                SrcContext,
                MethodName
              >,
            }))
          );
        }) ?? [];
    return merge(of(entityReducerConfigWithMethod), ...onErrorDelayedReducer$);
  }
  return of(entityReducerConfigWithMethod);
}

function bulkConnectAssociatedDelayedReducer$<
  TData,
  SrcContext,
  MethodName extends string
>({
  bulkReducerConfig,
  delayedReducer,
  events,
}: {
  bulkReducerConfig: BulkReducerConfig<TData, SrcContext, MethodName>;
  delayedReducer:
    | BulkDelayedReducer<TData, SrcContext, MethodName>[]
    | undefined;
  events: any;
}) {
  const { isLoading, isLoaded, hasError } =
    bulkReducerConfig.entitiesStatedData;
  // debugger;
  if (isLoading) {
    return of(bulkReducerConfig);
  }
  if (isLoaded) {
    const onLoadedDelayedReducer$ =
      delayedReducer
        ?.filter(({ reducer }) => reducer.onLoaded)
        .map(({ reducer, notifier }) => {
          return notifier(events).pipe(
            tap({
              next: (data) => console.log('[notifier] data', data),
              error: (error) => console.log('[notifier] error', error),
              complete: () => console.log('[notifier] complete'),
              subscribe: () => console.log('[notifier] subscribe'),
              unsubscribe: () => console.log('[notifier] unsubscribe'),
              finalize: () => console.log('[notifier] finalize'),
            }),
            map(() => {
              const result = {
                ...bulkReducerConfig,
                reducer,
              } satisfies BulkReducerConfig<TData, SrcContext, MethodName>;
              return result;
            })
          );
        }) ?? [];
    return merge(of(bulkReducerConfig), ...onLoadedDelayedReducer$);
  }

  if (hasError) {
    const onErrorDelayedReducer$ =
      delayedReducer
        ?.filter(({ reducer }) => reducer.onError)
        .map(({ reducer, notifier }) => {
          return notifier(events).pipe(
            map(
              () =>
                bulkReducerConfig satisfies BulkReducerConfig<
                  TData,
                  SrcContext,
                  MethodName
                >
            )
          );
        }) ?? [];
    return merge(of(bulkReducerConfig), ...onErrorDelayedReducer$);
  }
  return of(bulkReducerConfig);
}
