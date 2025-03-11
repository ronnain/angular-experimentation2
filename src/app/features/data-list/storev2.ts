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
} from 'rxjs';
import { statedStream } from '../../util/stated-stream/stated-stream';

// type FindAllRoutesThatAuthorizeTheResourceOwner<
//   TRootContract extends Record<string, any>
// > = {
//   [key in keyof TRootContract]: FindRoutesThatAuthorizeTheResourceOwner<
//     TRootContract[key],
//     UnionToTuple<keyof TRootContract[key]>
//   >;
// };

export type Operator = <T, R>(
  fn: (value: T) => Observable<R>
) => OperatorFunction<T, R>;

type MethodName = string;

type IdSelector<TData> = (entity: TData) => string | number;

type ReducerParams<TData> = {
  id: string | number;
  status: EntityStatus;
  entityWithStatus: EntityWithStatus<TData> | undefined;
  customIdSelector: IdSelector<TData>;
} & ContextualEntities<TData>;

type StatedData<T> = {
  readonly isLoading: boolean;
  readonly isLoaded: boolean;
  readonly hasError: boolean;
  readonly error: any;
  readonly result: T | undefined;
};

type Reducer<TData> = (data: ReducerParams<TData>) => ContextualEntities<TData>;

type StatedDataReducer<TData> = {
  onLoading?: Reducer<TData>;
  onLoaded?: Reducer<TData>;
  onError?: Reducer<TData>;
};

type StatedDataReducerWithoutOnLoading<TData> = Omit<
  StatedDataReducer<TData>,
  'onLoading'
>;

type EntityStatus = Omit<StatedData<unknown>, 'result'>;
type EntityWithStatus<TData> = {
  id: string | number;
  entity: TData | undefined;
  status: MethodStatus;
};
type MethodStatus = Record<MethodName, EntityStatus>;

type EntityReducerConfig<TData> = {
  entityStatedData: StatedData<TData>;
  reducer: StatedDataReducer<TData> | undefined;
  idSelector: IdSelector<TData>;
};

type EntityStateByMethodObservable<TData> = Observable<
  Record<
    MethodName,
    {
      [x: string]: EntityReducerConfig<TData>;
    }
  >
>[];

type ContextualEntities<TData> = {
  entities: EntityWithStatus<TData>[] | undefined;
  outOfContextEntities: EntityWithStatus<TData>[] | undefined;
};

type StatedEntities<TData> = StatedData<ContextualEntities<TData>>;

type DelayedReducer<TData> = {
  reducer: StatedDataReducerWithoutOnLoading<TData>;
  notifier: (events: any) => Observable<unknown>; // if not provided, the entity is not removed, otherwise it is removed after the duration emit
};

// todo create a plug function, that will ensure that mutation api call are not cancelled if the store is destroyed

export const Store2 = new InjectionToken('Store', {
  providedIn: 'root',
  factory: () => {
    return <TData, SrcContext>(data: {
      getEntities: {
        srcContext: Observable<SrcContext>;
        api: (srcContext: SrcContext) => Observable<TData[]>;
        initialData: TData[] | undefined;
        preservePreviousEntitiesWhenSrcContextEmit?: boolean;
      };
      entityIdSelector: IdSelector<TData>; // used to know of to identify the entity
      entityLevelAction?: Record<
        MethodName,
        {
          src: () => Observable<TData>;
          api: (entity: TData) => Observable<TData>;
          operator: Operator; // Use switchMap as default
          customIdSelector?: IdSelector<TData>; // used to know of to identify the entity, it is useful for creation, when the entity has no id yet
          // todo add status duration ?
          delayedReducer?: DelayedReducer<TData>[];
          reducer?: StatedDataReducer<TData>; // if not provided, it will update the entity in the list
        }
      >; // action that will affect the targeted entity, they can be triggered concurrently
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
      //       reducer?: StatedDataReducer<TData>; // if not provided, it will update the entity in the list
      //     }
      //   >;
    }) => {
      const entityIdSelector = data.entityIdSelector;
      const events = {}; // todo

      const entityLevelActionList$: EntityStateByMethodObservable<TData> =
        Object.entries(data.entityLevelAction ?? {}).reduce(
          (acc, [methodName, groupByData]) => {
            const src$ = groupByData.src();
            const operatorFn = groupByData.operator;
            const api = groupByData.api;
            const reducer = groupByData.reducer;
            const delayedReducer = groupByData.delayedReducer || [];
            const idSelector = groupByData.customIdSelector || entityIdSelector;

            const actionByEntity$: Observable<{
              [x: string]: {
                entityStatedData: StatedData<TData>;
                reducer: StatedDataReducer<TData> | undefined;
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
                        } satisfies EntityReducerConfig<TData>,
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
          },
          [] as EntityStateByMethodObservable<TData>
        );

      const entitiesData$ = data.getEntities.srcContext.pipe(
        switchMap((srcContextValue) =>
          statedStream(
            data.getEntities.api(srcContextValue),
            data.getEntities.initialData
          )
        ),
        share()
      );

      const finalResult = entitiesData$.pipe(
        switchMap((entitiesData) => {
          const seed = {
            ...entitiesData,
            result: {
              entities: entitiesData.result?.map((entity) => {
                return {
                  id: entityIdSelector(entity),
                  entity,
                  status: {} as MethodStatus,
                };
              }),
              outOfContextEntities: [] as EntityWithStatus<TData>[],
            },
          } satisfies StatedEntities<TData>;
          return merge(...entityLevelActionList$).pipe(
            //@ts-ignore
            scan((acc, actionByEntity) => {
              const methodName = Object.keys(actionByEntity)[0];
              const entityId = Object.keys(actionByEntity[methodName])[0];
              const {
                entityStatedData: {
                  error,
                  hasError,
                  isLoaded,
                  isLoading,
                  result,
                },
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
                    entityData.entity &&
                    idSelector(entityData.entity) == entityId
                );
              const updatedEntityValue: TData | undefined =
                previousEntityWithStatus?.entity
                  ? {
                      ...previousEntityWithStatus.entity,
                      ...incomingEntityValue,
                    }
                  : incomingEntityValue;

              const updatedEntity: EntityWithStatus<TData> = {
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
                },
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
                  } satisfies StatedEntities<TData>;
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
                              entity.entity &&
                              idSelector(entity.entity) !== entityId
                          )
                        : acc.result.outOfContextEntities,
                    },
                  } satisfies StatedEntities<TData>;
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
                } satisfies StatedEntities<TData>;
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
                  }),
                } satisfies StatedEntities<TData>;
              }

              return acc;
            }, seed),
            startWith(seed)
            // todo add hasDeleteEntity selectors...
          );
        }),
        scan((acc, finalEntities) => {
          // todo preserve outOfContexte in anyCase
          if (!data.getEntities.preservePreviousEntitiesWhenSrcContextEmit) {
            return finalEntities;
          }
          const hasPreviousData = acc.isLoaded;
          if (!hasPreviousData) {
            return finalEntities;
          }
          if (finalEntities.isLoading) {
            return {
              ...finalEntities,
              result: {
                entities: acc.result.entities,
                outOfContextEntities: acc.result.outOfContextEntities,
              },
            };
          }
          return finalEntities;
        }),
        tap({
          next: (data) => console.log('[final] data', data),
          error: (error) => console.log('[final] error', error),
          complete: () => console.log('[final] complete'),
          subscribe: () => console.log('[final] subscribe'),
          unsubscribe: () => console.log('[final] unsubscribe'),
          finalize: () => console.log('[final] finalize'),
        }),
        shareReplay(1)
      );

      return {
        data: finalResult,
      };
    };
  },
});
function replaceEntityIn<TData>({
  entities,
  entityId,
  updatedEntity,
}: {
  entities: EntityWithStatus<TData>[] | undefined;
  entityId: string;
  updatedEntity: EntityWithStatus<TData>;
}) {
  return entities?.map((entityData) => {
    if (entityData.id != entityId) {
      return entityData;
    }

    return updatedEntity;
  });
}

function connectAssociatedDelayedReducer$<TData>({
  entityReducerConfigWithMethod,
  delayedReducer,
  idSelector,
  events,
}: {
  entityReducerConfigWithMethod: Record<
    string | number,
    EntityReducerConfig<TData>
  >;
  delayedReducer: DelayedReducer<TData>[] | undefined;
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
              } satisfies EntityReducerConfig<TData>,
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
              } satisfies EntityReducerConfig<TData>,
            }))
          );
        }) ?? [];
    return merge(of(entityReducerConfigWithMethod), ...onErrorDelayedReducer$);
  }
  return of(entityReducerConfigWithMethod);
}
