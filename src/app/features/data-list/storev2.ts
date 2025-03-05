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

type ReducerParams<TData> = {
  id: string | number;
  status: EntityStatus;
  entity: TData | undefined;
  entities: EntityWithStatus<TData>[];
};

type StatedData<T> = {
  readonly isLoading: boolean;
  readonly isLoaded: boolean;
  readonly hasError: boolean;
  readonly error: any;
  readonly result: T | undefined;
};

type Reducer<TData> = (data: ReducerParams<TData>) => EntityWithStatus<TData>[];

type StatedDataReducer<TData> = {
  onLoading?: Reducer<TData>;
  onLoaded?: Reducer<TData>;
  onError?: Reducer<TData>;
};

type EntityStatus = Omit<StatedData<unknown>, 'result'>;
type EntityWithStatus<TData> = {
  entity: TData | undefined;
  status: MethodStatus;
};
type MethodStatus = Record<MethodName, EntityStatus>;

type EntityStateByMethodObservable<TData> = Observable<
  Record<
    MethodName,
    {
      [x: string]: {
        entityStatedData: StatedData<TData>;
        reducer: StatedDataReducer<TData> | undefined;
      };
    }
  >
>[];
export const Store2 = new InjectionToken('Store', {
  providedIn: 'root',
  factory: () => {
    return <TData>(data: {
      getEntities: {
        src: Observable<unknown>;
        api: () => Observable<TData[]>;
        initialData: TData[] | undefined;
      };
      entityIdSelector: (item: TData) => string | number; // used to know of to identify the entity
      actionByEntity?: Record<
        MethodName,
        {
          src: () => Observable<TData>;
          api: (item: TData) => Observable<TData>;
          operator: Operator; // Use switchMap as default
          // todo add status duration ?
          removedEntityOn?: {
            filterCompare: (item: TData) => boolean; // filter function that is used to removed item when the notifier emit
            notifier: (events: any) => Observable<unknown>; // if not provided, the item is not removed, otherwise it is removed after the duration emit
          }[];
          reducer?: StatedDataReducer<TData>; // if not provided, it will update the entity in the list
        }
      >; // action that will affect the targeted entity, they can be triggered parallelly
    }) => {
      const entityIdSelector = data.entityIdSelector;

      const entitiesData$ = data.getEntities.src.pipe(
        switchMap(() =>
          statedStream(data.getEntities.api(), data.getEntities.initialData)
        ),
        share()
      );

      const actionByEntityList$ = Object.entries(
        data.actionByEntity ?? {}
      ).reduce((acc, [methodName, groupByData]) => {
        const src$ = groupByData.src();
        const operatorFn = groupByData.operator;
        const api = groupByData.api;
        const reducer = groupByData.reducer;
        const removedEntityOn$ = groupByData.removedEntityOn || []; // todo

        const actionByEntity$ = src$.pipe(
          groupBy((entity) => data.entityIdSelector(entity)),
          mergeMap((groupedItemById$) => {
            return groupedItemById$.pipe(
              operatorFn((item) => {
                return statedStream(api(item), item).pipe(
                  map((entityStatedData) => ({
                    [entityIdSelector(item)]: {
                      entityStatedData,
                      reducer,
                    } satisfies {
                      entityStatedData: StatedData<TData>;
                      reducer?: StatedDataReducer<TData>;
                    },
                  }))
                );
              })
            );
          })
        );

        return [
          ...acc,
          actionByEntity$.pipe(
            map((groupedItemById) => ({ [methodName]: groupedItemById }))
          ),
        ];
      }, [] as EntityStateByMethodObservable<TData>);

      const finalResult = entitiesData$.pipe(
        switchMap((entitiesData) => {
          const seed = {
            ...entitiesData,
            result: entitiesData.result?.map((entity) => {
              return {
                entity,
                status: {} as MethodStatus,
              };
            }),
          } satisfies StatedData<EntityWithStatus<TData>[]>;
          return merge(...actionByEntityList$).pipe(
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
              } = actionByEntity[methodName][entityId];

              const incomingEntityValue = result;
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

              debugger;

              // ! ne marche pas pour le create

              if (!customReducer || !acc.result) {
                const updatedResult = acc.result?.map((entityData) => {
                  if (entityIdSelector(entityData.entity) != entityId) {
                    return entityData;
                  }

                  return {
                    entity: incomingEntityValue,
                    status: {
                      ...entityData.status,
                      [methodName]: incomingStatus,
                    } satisfies MethodStatus,
                  } satisfies EntityWithStatus<TData>;
                });
                return {
                  ...acc,
                  result: updatedResult,
                } satisfies StatedData<EntityWithStatus<TData>[]>;
              }

              return {
                ...acc,
                result: customReducer({
                  entities: acc.result,
                  entity: incomingEntityValue,
                  status: incomingStatus,
                  id: entityId,
                }),
              } satisfies StatedData<EntityWithStatus<TData>[]>;
            }, seed),
            startWith(seed)
            // todo add hasDeleteItem selectors...
          );
        })
      );

      return {
        data: finalResult,
      };
    };
  },
});
