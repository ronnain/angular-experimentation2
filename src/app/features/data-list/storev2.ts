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
  Subject,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs';
import { statedStream } from '../../util/stated-stream/stated-stream';
import { ActionSubjectEvent, DataListMainTypeScope } from './storev3';
import { Prettify } from '../../util/types/prettify';

export type Operator = <T, R>(
  fn: (value: T) => Observable<R>
) => OperatorFunction<T, R>;

type MethodName = string;

export type IdSelector<TMainConfig extends DataListMainTypeScope> = (
  entity: TMainConfig['entity']
) => string | number;

export type ReducerParams<TMainConfig extends DataListMainTypeScope> = {
  id: string | number;
  status: EntityStatus;
  entityWithStatus: Prettify<EntityWithStatus<TMainConfig>>; // todo check why there is still status here ?
  entityIdSelector: IdSelector<TMainConfig>;
  context: TMainConfig['pagination'];
} & ContextualEntities<TMainConfig>;

export type BulkReducerParams<TMainConfig extends DataListMainTypeScope> = {
  bulkEntities: EntityWithStatus<TMainConfig>[];
  entityIdSelector: IdSelector<TMainConfig>;
  context: TMainConfig['pagination'];
} & ContextualEntities<TMainConfig>;

export type StatedData<T> = {
  readonly isLoading: boolean;
  readonly isLoaded: boolean;
  readonly hasError: boolean;
  readonly error: any;
  readonly result: T;
};

export type Reducer<TMainConfig extends DataListMainTypeScope> = (
  data: Prettify<ReducerParams<TMainConfig>>
) => ContextualEntities<TMainConfig>;

export type StatedDataReducer<TMainConfig extends DataListMainTypeScope> = {
  onLoading?: Reducer<TMainConfig>;
  onLoaded?: Reducer<TMainConfig>;
  onError?: Reducer<TMainConfig>;
};

export type BulkReducer<TMainConfig extends DataListMainTypeScope> = (
  data: BulkReducerParams<TMainConfig>
) => ContextualEntities<TMainConfig>;

export type BulkStatedDataReducer<TMainConfig extends DataListMainTypeScope> = {
  onLoading?: BulkReducer<TMainConfig>;
  onLoaded?: BulkReducer<TMainConfig>;
  onError?: BulkReducer<TMainConfig>;
};

type StatedDataReducerWithoutOnLoading<
  TMainConfig extends DataListMainTypeScope
> = Omit<StatedDataReducer<TMainConfig>, 'onLoading'>;

type BulkStatedDataReducerWithoutOnLoading<
  TMainConfig extends DataListMainTypeScope
> = Omit<BulkStatedDataReducer<TMainConfig>, 'onLoading'>;

export type EntityStatus = Prettify<Omit<StatedData<unknown>, 'result'>>;
export type EntityWithStatus<TMainConfig extends DataListMainTypeScope> = {
  entity: TMainConfig['entity'];
  status: MethodStatus<TMainConfig>;
};
type EntityWithStatusWithSelectors<TMainConfig extends DataListMainTypeScope> =
  {
    entity: TMainConfig['entity'];
    status: MethodStatus<TMainConfig>;
    selectors: any;
  };
export type MethodStatus<TMainConfig extends DataListMainTypeScope> = Partial<
  Record<
    TMainConfig['actions'] | NonNullable<TMainConfig['bulkActions']>,
    EntityStatus
  >
>;

export type EntityReducerConfig<TMainConfig extends DataListMainTypeScope> = {
  entityStatedData: StatedData<TMainConfig['entity']>;
  reducer: StatedDataReducer<TMainConfig> | undefined;
  entityIdSelector: IdSelector<TMainConfig>;
};

export type EntityStateByMethodObservable<
  TMainConfig extends DataListMainTypeScope
> = Observable<
  Record<
    MethodName,
    {
      [x: string]: EntityReducerConfig<TMainConfig>;
    }
  >
>[];

export type BulkReducerConfig<TMainConfig extends DataListMainTypeScope> = {
  entitiesStatedData: StatedData<TMainConfig['entity'][]>;
  reducer: BulkStatedDataReducer<TMainConfig> | undefined;
  entityIdSelector: IdSelector<TMainConfig>;
};

export type BulkStateByMethodObservable<
  TMainConfig extends DataListMainTypeScope
> = Observable<
  Record<
    NonNullable<TMainConfig['bulkActions']>,
    BulkReducerConfig<TMainConfig>
  >
>[];

export type ContextualEntities<TMainConfig extends DataListMainTypeScope> = {
  entities: Prettify<EntityWithStatus<TMainConfig>>[];
  outOfContextEntities: Prettify<EntityWithStatus<TMainConfig>>[];
};

export type StatedEntities<TMainConfig extends DataListMainTypeScope> =
  StatedData<
    ContextualEntities<TMainConfig> & {
      context: TMainConfig['pagination'] | undefined;
    }
  >;

type StatedEntitiesWithSelectors<
  TMainConfig extends DataListMainTypeScope,
  TEntitySelectors,
  TStoreSelectors
> = StatedData<
  Prettify<
    ContextualEntitiesWithSelectors<TMainConfig> & {
      context: TMainConfig['pagination'] | undefined;
      /**
       * Selectors that are used to select the entities in the store
       */
      selectors: Prettify<TStoreSelectors>;
    }
  >
>;

type ContextualEntitiesWithSelectors<
  TMainConfig extends DataListMainTypeScope
> = {
  entities: Prettify<EntityWithStatusWithSelectors<TMainConfig>>[];
  outOfContextEntities: Prettify<EntityWithStatusWithSelectors<TMainConfig>>[];
};

export type DelayedReducer<TMainConfig extends DataListMainTypeScope> = {
  reducer: StatedDataReducerWithoutOnLoading<TMainConfig>;
  notifier: (events: any) => Observable<unknown>; // it can be used to removed an entity from the lists after a certain time or a certain trigger
};

export type BulkDelayedReducer<TMainConfig extends DataListMainTypeScope> = {
  reducer: BulkStatedDataReducerWithoutOnLoading<TMainConfig>;
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

type EntitiesSource<TData, TEntitiesSrc, ActionNames extends string> = {
  srcContext: Observable<TEntitiesSrc>;
  query: (srcContext: TEntitiesSrc) => Observable<TData[]>;
  initialData: TData[] | undefined;
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

export type FinalResult<
  TMainConfig extends DataListMainTypeScope,
  TEntitySelectors,
  TStoreSelectors
> = Observable<
  Prettify<
    StatedEntitiesWithSelectors<TMainConfig, TEntitySelectors, TStoreSelectors>
  >
>;

type Selectors<TMainConfig extends DataListMainTypeScope> = {
  entityLevel?: (
    params: EntityWithStatus<TMainConfig> & {
      context: TMainConfig['pagination'] | undefined;
    }
  ) => Record<string, unknown>;
  storeLevel?: (
    params: ContextualEntities<TMainConfig> & {
      context: TMainConfig['pagination'] | undefined;
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

export type WithSelectors<TMainConfig extends DataListMainTypeScope> = {
  // todo make it optional
  entityLevel?: (
    params: EntityWithStatus<TMainConfig> & {
      context: TMainConfig['pagination'];
    }
  ) => Record<string, unknown>;
  storeLevel?: (
    params: ContextualEntities<TMainConfig> & {
      context: TMainConfig['pagination'];
    }
  ) => Record<string, unknown>;
};
type ErrorMessage<T extends string> = T;
export function applySelectors<
  TMainConfig extends DataListMainTypeScope,
  TEntitySelectors,
  TEntitiesSelectors
>(selectors?: WithSelectors<TMainConfig>) {
  return map((acc: StatedEntities<TMainConfig>) => ({
    ...acc,
    result: {
      ...acc.result,
      entities: acc.result.entities.map((entityData) => ({
        ...entityData,
        selectors: selectors?.entityLevel?.({
          ...entityData,
          context: acc.result.context,
        }) as TEntitySelectors,
      })),
      outOfContextEntities: acc.result.outOfContextEntities.map(
        (entityData) => ({
          ...entityData,
          selectors: selectors?.entityLevel?.({
            ...entityData,
            context: acc.result.context,
          }) as TEntitySelectors,
        })
      ),
      selectors: selectors?.storeLevel?.({
        context: acc.result.context,
        entities: acc.result.entities,
        outOfContextEntities: acc.result.outOfContextEntities,
      }) as TEntitiesSelectors,
    },
  }));
}

export function applyActionOnEntities<
  TMainConfig extends DataListMainTypeScope
>({
  acc,
  actionByEntity,
  context,
}: {
  acc: StatedEntities<TMainConfig>;
  actionByEntity: Record<
    string,
    {
      [x: string]: EntityReducerConfig<TMainConfig>;
    }
  >;
  context: TMainConfig['pagination'];
}): StatedEntities<TMainConfig> {
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
  const updatedEntityValue: TMainConfig['entity'] | undefined =
    previousEntityWithStatus?.entity
      ? {
          ...previousEntityWithStatus.entity,
          ...incomingEntityValue,
        }
      : incomingEntityValue;

  const updatedEntity: EntityWithStatus<TMainConfig> = {
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
    } as MethodStatus<TMainConfig>,
  };
  const incomingMethodStatus: EntityStatus = {
    isLoading,
    isLoaded,
    hasError,
    error,
  };
  debugger;

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

export function applyBulkActionOnEntities<
  TMainConfig extends DataListMainTypeScope
>({
  acc,
  bulkAction,
  context,
}: {
  acc: StatedEntities<TMainConfig>;
  bulkAction: Record<
    NonNullable<TMainConfig['bulkActions']>,
    BulkReducerConfig<TMainConfig>
  >;
  context: TMainConfig['pagination'];
}): StatedEntities<TMainConfig> {
  const methodName = Object.keys(bulkAction)[0] as NonNullable<
    TMainConfig['bulkActions']
  > &
    NonNullable<TMainConfig['actions']>;
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

  const updatedEntities: EntityWithStatus<TMainConfig>[] =
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
  ) as BulkReducer<TMainConfig> | undefined; // todo fix this type
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

function replaceEntityIn<TMainConfig extends DataListMainTypeScope>({
  entities,
  entityId,
  updatedEntity,
  entityIdSelector,
}: {
  entities: EntityWithStatus<TMainConfig>[];
  entityId: string; // todo remove this field and use only the entityIdSelector
  updatedEntity: EntityWithStatus<TMainConfig>;
  entityIdSelector: IdSelector<TMainConfig>;
}) {
  return entities?.map((entityData) => {
    if (entityIdSelector(entityData.entity) != entityId) {
      return entityData;
    }

    return updatedEntity;
  });
}

export function connectAssociatedDelayedReducer$<
  TMainConfig extends DataListMainTypeScope
>({
  entityReducerConfigWithMethod,
  delayedReducer,
  entityIdSelector,
  events,
}: {
  entityReducerConfigWithMethod: Record<
    string,
    EntityReducerConfig<TMainConfig>
  >;
  delayedReducer: DelayedReducer<TMainConfig>[] | undefined;
  entityIdSelector: IdSelector<TMainConfig>;
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
              } satisfies EntityReducerConfig<TMainConfig>,
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
              } satisfies EntityReducerConfig<TMainConfig>,
            }))
          );
        }) ?? [];
    return merge(of(entityReducerConfigWithMethod), ...onErrorDelayedReducer$);
  }
  return of(entityReducerConfigWithMethod);
}

export function bulkConnectAssociatedDelayedReducer$<
  TMainConfig extends DataListMainTypeScope
>({
  bulkReducerConfig,
  delayedReducer,
  events,
}: {
  bulkReducerConfig: BulkReducerConfig<TMainConfig>;
  delayedReducer: BulkDelayedReducer<TMainConfig>[] | undefined;
  events: any;
}): Observable<BulkReducerConfig<TMainConfig>> {
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
              } satisfies BulkReducerConfig<TMainConfig>;
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
              () => bulkReducerConfig satisfies BulkReducerConfig<TMainConfig>
            )
          );
        }) ?? [];
    return merge(of(bulkReducerConfig), ...onErrorDelayedReducer$);
  }
  return of(bulkReducerConfig);
}

/// events

export function emitActionEvent<TMainConfig extends DataListMainTypeScope>({
  acc,
  actionByEntity,
  context,
  actionEvents,
}: {
  acc: StatedEntities<TMainConfig>;
  actionByEntity: Record<
    string,
    {
      [x: string]: EntityReducerConfig<TMainConfig>;
    }
  >;
  context: TMainConfig['pagination'];
  actionEvents: Record<
    TMainConfig['actions'],
    Subject<ActionSubjectEvent<TMainConfig>>
  >;
}) {
  const methodName = Object.keys(actionByEntity)[0];
  const entityId = Object.keys(actionByEntity[methodName])[0];
  const {
    entityStatedData: { error, hasError, isLoaded, isLoading, result },
    reducer,
    entityIdSelector,
  } = actionByEntity[methodName][entityId];

  const entityWithStatus = [
    ...acc.result.entities,
    ...acc.result.outOfContextEntities,
  ].find((entity) => entityIdSelector(entity.entity) == entityId);

  if (!entityWithStatus) {
    return;
  }

  actionEvents[methodName as TMainConfig['actions']].next({
    status: { error, hasError, isLoaded, isLoading },
    context,
    entityWithStatus,
  });
}
