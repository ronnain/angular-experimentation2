import { InjectionToken } from '@angular/core';
import {
  groupBy,
  map,
  merge,
  mergeMap,
  Observable,
  OperatorFunction,
  scan,
  share,
  startWith,
  switchMap,
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

// todo create a plug function, that will ensure that mutation api call are not cancelled if the store is destroyed

export const Store2 = new InjectionToken('Store', {
  providedIn: 'root',
  factory: () => {
    return <TData>(data: {
      getEntities: {
        src: Observable<unknown>;
        api: () => Observable<TData[]>;
        initialData: TData[] | undefined;
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
          removedEntityOn?: {
            // todo it will be used to update the item later when it emit, for remove
            filterCompare: (entity: TData) => boolean; // filter function that is used to removed entity when the notifier emit
            notifier: (events: any) => Observable<unknown>; // if not provided, the entity is not removed, otherwise it is removed after the duration emit
          }[];
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

      const entitiesData$ = data.getEntities.src.pipe(
        switchMap(() =>
          statedStream(data.getEntities.api(), data.getEntities.initialData)
        ),
        share()
      );

      const entityLevelActionList$ = Object.entries(
        data.entityLevelAction ?? {}
      ).reduce((acc, [methodName, groupByData]) => {
        const src$ = groupByData.src();
        const operatorFn = groupByData.operator;
        const api = groupByData.api;
        const reducer = groupByData.reducer;
        const removedEntityOn$ = groupByData.removedEntityOn || []; // todo
        const idSelector = groupByData.customIdSelector || entityIdSelector;

        const actionByEntity$ = src$.pipe(
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
                  }))
                );
              })
            );
          })
        );

        return [
          ...acc,
          actionByEntity$.pipe(
            map((groupedEntityById) => ({ [methodName]: groupedEntityById }))
          ),
        ];
      }, [] as EntityStateByMethodObservable<TData>);

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
              const incomingStatus: EntityStatus = {
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
              // todo si géré si présent dans outOfContext et entities
              // merger l'info et la mettre dans le entities
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
                    status: incomingStatus,
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
        })
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
