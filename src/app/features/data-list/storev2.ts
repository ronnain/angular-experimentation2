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
  startWith,
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
  customIdSelector: IdSelector<TData>;
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
type EntityWithStatus<TData, MethodName extends string> = {
  id: string | number;
  entity: TData;
  status: MethodStatus<MethodName>;
};
type MethodStatus<MethodName extends string> = Partial<Record<MethodName, EntityStatus>>;

type EntityReducerConfig<TData, TContext, MethodName extends string> = {
  entityStatedData: StatedData<TData>;
  reducer: StatedDataReducer<TData, TContext, MethodName> | undefined;
  idSelector: IdSelector<TData>;
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

type StatedEntities<TData, MethodName extends string> = StatedData<
  ContextualEntities<TData, MethodName>
>;

type DelayedReducer<TData, TContext, MethodName extends string> = {
  reducer: StatedDataReducerWithoutOnLoading<TData, TContext, MethodName>;
  notifier: (events: any) => Observable<unknown>; // if not provided, the entity is not removed, otherwise it is removed after the duration emit
};

export function entityLevelAction<TSrcGetAllContext>() {
  return <TSrc, TData, MethodName extends string>(
    config: EntityLevelActionConfig<TSrcGetAllContext, TSrc, TData, MethodName>
  ): EntityLevelActionConfig<TSrcGetAllContext, TSrc, TData, MethodName> =>
    config;
}

type EntityLevelActionConfig<
  TSrcGetAllContext,
  TSrc,
  TData,
  MethodName extends string
> = {
  src: () => Observable<TSrc>;
  api: (params: { data: TSrc }) => Observable<TData>;
  operator: Operator; // Use switchMap as default
  customIdSelector?: IdSelector<NoInfer<TData>>; // used to know of to identify the entity, it is useful for creation, when the entity has no id yet
  // todo add status duration ?
  delayedReducer?: DelayedReducer<
    NoInfer<TData>,
    TSrcGetAllContext,
    MethodName
  >[];
  reducer?: StatedDataReducer<NoInfer<TData>, TSrcGetAllContext, MethodName>; // if not provided, it will update the entity in the list
};

// todo create a plug function, that will ensure that mutation api call are not cancelled if the store is destroyed
// todo improve the statedStream typing
// todo improve typing (src)
// todo fix multiples entities creation make some duplication
// todo create helper function, (to merge/add/remove entities)
// todo add events

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
        EntityLevelActionConfig<any, any, any, any>
      >
    >(data: {
      getEntities: {
        srcContext: Observable<SrcContext>;
        api: (srcContext: SrcContext) => Observable<TData[]>;
        initialData: TData[] | undefined;
        preservePreviousEntitiesWhenSrcContextEmit?: boolean;
      };
      entityIdSelector: IdSelector<TData>; // used to know of to identify the entity
      entityLevelAction?: TEntityLevelActions; // todo // action that will affect the targeted entity, they can be triggered concurrently
      //   entitiesLevelAction?: Record<
      //     MethodName,
      //     {
      //       src: () => Observable<TData>;
      //       api: (entity: TData) => Observable<TData>;
      //       operator: Operator; // Use switchMap as default (prefer switchMap, concatMap, or exhaustMap), you may want to avoid mergeMap because it can trigger multiple request in parallel, the response with the loading status will be merged (the status may alternate between loading and loaded)
      //       // todo add status duration ?
      //       removedEntityOn?: {
      //         filterCompare: (entity: TData) => boolean; // filter function that is used to removed entity when the notifier emit
      //         notifier: (events: any) => Observable<unknown>; // if not provided, the entity is not removed, otherwise it is removed after the duration emit
      //       }[];
      //       idSelector?: (entity: TData) => string | number; // used to know of to identify the entity, it is useful for creation, when the entity has no id yet
      //       reducer?: StatedDataReducer<TData, SrcContext>; // if not provided, it will update the entity in the list
      //     }
      //   >;
    }) => {
      const entityIdSelector = data.entityIdSelector;
      const events = {}; // todo

      const entityLevelActionList$: EntityStateByMethodObservable<
        TData,
        SrcContext
      > = Object.entries(
        (data.entityLevelAction ?? {}) as Record<
          string,
          EntityLevelActionConfig<SrcContext, any, TData, MethodName>
        >
      ).reduce((acc, [methodName, groupByData]) => {
        const src$ = groupByData.src();
        const operatorFn = groupByData.operator;
        const api = groupByData.api;
        const reducer = groupByData.reducer;
        const delayedReducer = groupByData.delayedReducer || [];
        const idSelector = groupByData.customIdSelector || entityIdSelector;

        const actionByEntity$: Observable<{
          [x: MethodName]: {
            entityStatedData: StatedData<TData>;
            reducer:
              | StatedDataReducer<TData, SrcContext, MethodName>
              | undefined;
            idSelector: IdSelector<TData>;
          };
        }> = src$.pipe(
          groupBy((entity) => idSelector(entity)),
          mergeMap((groupedEntityById$) => {
            return groupedEntityById$.pipe(
              operatorFn((entity) => {
                return statedStream(api(entity), entity).pipe(
                  map((entityStatedData) => ({
                    [entityIdSelector(entity)]: {
                      entityStatedData,
                      reducer,
                      idSelector,
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
                      idSelector,
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
      const finalResult: Observable<
        StatedEntities<TData, TEntityLevelActionsKeys>
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
                    } as MethodStatus<MethodName>,
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
            },
          } satisfies StatedEntities<TData, MethodName> as StatedEntities<
            TData,
            MethodName
          > // satisfies apply an as const effect
        ),
        shareReplay(1)
      );

      return {
        data: finalResult,
      };
    };
  },
});
function applyActionOnEntities<TData, SrcContext, MethodName extends string>({
  acc,
  actionByEntity,
  context,
}: {
  acc: StatedEntities<TData, MethodName>;
  actionByEntity: Record<
    string,
    {
      [x: string]: EntityReducerConfig<TData, SrcContext, MethodName>;
    }
  >;
  context: SrcContext;
}): StatedEntities<TData, MethodName> {
  const methodName = Object.keys(actionByEntity)[0];
  const entityId = Object.keys(actionByEntity[methodName])[0];
  const {
    entityStatedData: { error, hasError, isLoaded, isLoading, result },
    reducer,
    idSelector,
  } = actionByEntity[methodName][entityId];

  const incomingEntityValue = result;
  const previousEntityWithStatus =
    acc.result.entities?.find(
      (entityData) => idSelector(entityData.entity) == entityId
    ) ??
    acc.result.outOfContextEntities?.find(
      (entityData) =>
        entityData.entity && idSelector(entityData.entity) == entityId
    );
  const updatedEntityValue: TData | undefined = previousEntityWithStatus?.entity
    ? {
        ...previousEntityWithStatus.entity,
        ...incomingEntityValue,
      }
    : incomingEntityValue;

  const updatedEntity: EntityWithStatus<TData, MethodName> = {
    ...previousEntityWithStatus,
    id: entityId,
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
      (entityData) => idSelector(entityData.entity) == entityId
    );
    const isEntityInOutOfContextEntities =
      acc.result.outOfContextEntities?.some(
        (entityData) => entityData.id == entityId
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
          }),
          outOfContextEntities: isEntityInOutOfContextEntities
            ? acc.result.outOfContextEntities.filter(
                (entity) =>
                  entity.entity && idSelector(entity.entity) !== entityId
              )
            : acc.result.outOfContextEntities,
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
        }),
      },
    };
  }

  if (customReducer) {
    return {
      ...acc,
      result: customReducer({
        entities: acc.result.entities,
        outOfContextEntities: acc.result.outOfContextEntities,
        entityWithStatus: updatedEntity,
        status: incomingMethodStatus,
        customIdSelector: idSelector,
        id: entityId,
        context,
      }),
    };
  }

  return acc;
}

function replaceEntityIn<TData, MethodName extends string>({
  entities,
  entityId,
  updatedEntity,
}: {
  entities: EntityWithStatus<TData, MethodName>[];
  entityId: string;
  updatedEntity: EntityWithStatus<TData, MethodName>;
}) {
  return entities?.map((entityData) => {
    if (entityData.id != entityId) {
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
  idSelector,
  events,
}: {
  entityReducerConfigWithMethod: Record<
    string | number,
    EntityReducerConfig<TData, SrcContext, MethodName>
  >;
  delayedReducer: DelayedReducer<TData, SrcContext, MethodName>[] | undefined;
  idSelector: IdSelector<TData>;
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
                idSelector,
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
                idSelector,
              } satisfies EntityReducerConfig<TData, SrcContext, MethodName>,
            }))
          );
        }) ?? [];
    return merge(of(entityReducerConfigWithMethod), ...onErrorDelayedReducer$);
  }
  return of(entityReducerConfigWithMethod);
}
