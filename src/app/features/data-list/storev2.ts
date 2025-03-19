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

type IdSelector<TData> = (entity: TData) => string | number;

export type ReducerParams<TData, TContext, MethodName extends string> = {
  id: string | number;
  status: EntityStatus;
  entityWithStatus: EntityWithStatus<TData, MethodName>;
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

type StatedDataReducer<TData, TContext, MethodName extends string> = {
  onLoading?: Reducer<TData, TContext, MethodName>;
  onLoaded?: Reducer<TData, TContext, MethodName>;
  onError?: Reducer<TData, TContext, MethodName>;
};

type StatedDataReducerWithoutOnLoading<
  TData,
  TContext,
  MethodName extends string
> = Omit<StatedDataReducer<TData, TContext, MethodName>, 'onLoading'>;

type EntityStatus = Omit<StatedData<unknown>, 'result'>;
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

type ContextualEntities<TData, MethodName extends string> = {
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

type DelayedReducer<TData, TContext, MethodName extends string> = {
  reducer: StatedDataReducerWithoutOnLoading<TData, TContext, MethodName>;
  notifier: (events: any) => Observable<unknown>; // it can be used to removed an entity from the lists after a certain time or a certain trigger
};

export function entityLevelAction<TSrc, TData>(
  config: EntityLevelActionConfig<TSrc, TData>
) {
  return config;
}

export type EntityLevelActionConfig<TSrc, TData> = {
  src: () => Observable<TSrc>;
  api: (params: { data: TSrc }) => Observable<TData>;
  operator: Operator; // Use switchMap as default
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
// todo improve the statedStream typing
// todo create helper function, (to merge/add/remove entities)
// todo add events
// todo create a type helper function to ensure that ensure that the methods name union are the same
// todo try to integrate slector using a pipe methode ?
// todo supprimer les noinfer ?
// todo retry to pass the entityLevelSelector types to the store selectors

export const Store2 = new InjectionToken('Store', {
  providedIn: 'root',
  factory: () => {
    return <
      TData,
      SrcContext,
      TEntityLevelActionsKeys extends keyof TEntityLevelActions extends string
        ? keyof TEntityLevelActions
        : never,
      TEntityLevelActions extends Record<
        TEntityLevelActionsKeys,
        EntityLevelActionConfig<SrcContext, NoInfer<TData>>
      >,
      TSelectors extends Selectors<TData, TEntityLevelActionsKeys, SrcContext>,
      TReducer extends Partial<
        Record<
          TEntityLevelActionsKeys,
          StatedDataReducer<TData, SrcContext, TEntityLevelActionsKeys>
        >
      >,
      TDelayedReducer extends Partial<
        Record<
          TEntityLevelActionsKeys,
          DelayedReducer<NoInfer<TData>, SrcContext, TEntityLevelActionsKeys>[]
        >
      >
    >(data: {
      getEntities: {
        srcContext: Observable<SrcContext>;
        api: (srcContext: SrcContext) => Observable<TData[]>;
        initialData: TData[] | undefined;
      };
      entityIdSelector: IdSelector<TData>; // used to know of to identify the entity
      entityLevelAction?: TEntityLevelActions; // action that will affect the targeted entity, they can be triggered concurrently
      reducer?: TReducer; // if not provided, it will update the entity in the list (entities or outOfContextEntities)
      delayedReducer?: TDelayedReducer;
      selectors?: TSelectors;
    }) => {
      const entityIdSelector = data.entityIdSelector;
      const events = {}; // todo

      const entityLevelActionList$: EntityStateByMethodObservable<TData, any> =
        Object.entries(
          (data.entityLevelAction ?? {}) as Record<
            string,
            EntityLevelActionConfig<any, TData>
          >
        ).reduce((acc, [methodName, groupByData]) => {
          const src$ = groupByData.src();
          const operatorFn = groupByData.operator;
          const api = groupByData.api;
          const reducer = data.reducer?.[methodName as TEntityLevelActionsKeys];
          const delayedReducer =
            data.delayedReducer?.[methodName as TEntityLevelActionsKeys] || [];

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
                      connectAssociatedDelayedReducer$({
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

      const entitiesData$ = data.getEntities.srcContext.pipe(
        switchMap((srcContextValue) =>
          statedStream(
            data.getEntities.api(srcContextValue),
            data.getEntities.initialData
          )
        ),
        share()
      );

      // I choose to merge the entitiesData$ and the entityLevelActionList$, that's enable to add some items even if entities are not loaded yet
      const finalResult: FinalResult<
        TData,
        TEntityLevelActionsKeys,
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
        ...entityLevelActionList$.map(
          map((entityLevelActionList) => ({
            type: 'action' as const,
            data: entityLevelActionList,
          }))
        )
      ).pipe(
        withLatestFrom(data.getEntities.srcContext),
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
                    } as MethodStatus<TEntityLevelActionsKeys>,
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
          > as StatedEntities<TData, TEntityLevelActionsKeys, SrcContext> // satisfies apply an as const effect
        ),
        applySelectors<
          TData,
          SrcContext,
          TEntityLevelActionsKeys,
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
  TEntityLevelActionsKeys extends keyof TEntityLevelActions extends string
    ? keyof TEntityLevelActions
    : never,
  TEntityLevelActions extends Record<
    TEntityLevelActionsKeys,
    EntityLevelActionConfig<SrcContext, TData>
  >,
  TSelectors extends Selectors<TData, TEntityLevelActionsKeys, SrcContext>
>(selectors?: TSelectors) {
  return map(
    (acc: StatedEntities<TData, TEntityLevelActionsKeys, SrcContext>) => ({
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
    })
  );
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

function replaceEntityIn<TData, MethodName extends string>({
  entities,
  entityId,
  updatedEntity,
  entityIdSelector,
}: {
  entities: EntityWithStatus<TData, MethodName>[];
  entityId: string;
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
  TData,
  SrcContext,
  MethodName extends string
>({
  entityReducerConfigWithMethod,
  delayedReducer,
  entityIdSelector,
  events,
}: {
  entityReducerConfigWithMethod: Record<
    string | number,
    EntityReducerConfig<TData, SrcContext, MethodName>
  >;
  delayedReducer: DelayedReducer<TData, SrcContext, MethodName>[] | undefined;
  entityIdSelector: IdSelector<TData>;
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
              } satisfies EntityReducerConfig<TData, SrcContext, MethodName>,
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
              [id as string | number]: {
                entityStatedData: entityReducerConfig.entityStatedData,
                reducer,
                entityIdSelector,
              } satisfies EntityReducerConfig<TData, SrcContext, MethodName>,
            }))
          );
        }) ?? [];
    return merge(of(entityReducerConfigWithMethod), ...onErrorDelayedReducer$);
  }
  return of(entityReducerConfigWithMethod);
}
