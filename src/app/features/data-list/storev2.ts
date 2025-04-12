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
import { DataListMainTypeScope } from './storev3';
import { Prettify } from '../../util/types/prettify';

export type Operator = <T, R>(
  fn: (value: T) => Observable<R>
) => OperatorFunction<T, R>;

type MethodName = string;

export type IdSelector<TData> = (entity: TData) => string | number;

export type ReducerParams<TData, TContext, MethodName extends string> = {
  id: string | number;
  status: EntityStatus;
  entityWithStatus: Prettify<EntityWithStatus<TData, MethodName>>; // todo check why there is still status here ?
  entityIdSelector: IdSelector<TData>;
  context: TContext;
} & ContextualEntities<TData, MethodName>;

export type BulkReducerParams<TMainConfig extends DataListMainTypeScope> = {
  bulkEntities: EntityWithStatus<TMainConfig['entity'], MethodName>[];
  entityIdSelector: IdSelector<TMainConfig['entity']>;
  context: TMainConfig['pagination'];
} & ContextualEntities<
  TMainConfig['entity'],
  NonNullable<TMainConfig['bulkActions']>
>;

export type StatedData<T> = {
  readonly isLoading: boolean;
  readonly isLoaded: boolean;
  readonly hasError: boolean;
  readonly error: any;
  readonly result: T;
};

export type Reducer<TData, TContext, MethodName extends string> = (
  data: Prettify<ReducerParams<TData, TContext, MethodName>>
) => ContextualEntities<TData, MethodName>;

export type StatedDataReducer<TData, TContext, MethodName extends string> = {
  onLoading?: Reducer<TData, TContext, MethodName>;
  onLoaded?: Reducer<TData, TContext, MethodName>;
  onError?: Reducer<TData, TContext, MethodName>;
};

export type BulkReducer<TMainConfig extends DataListMainTypeScope> = (
  data: BulkReducerParams<TMainConfig>
) => ContextualEntities<
  TMainConfig['entity'],
  NonNullable<TMainConfig['bulkActions']>
>;

type BulkStatedDataReducer<TMainConfig extends DataListMainTypeScope> = {
  onLoading?: BulkReducer<TMainConfig>;
  onLoaded?: BulkReducer<TMainConfig>;
  onError?: BulkReducer<TMainConfig>;
};

type StatedDataReducerWithoutOnLoading<
  TData,
  TContext,
  MethodName extends string
> = Omit<StatedDataReducer<TData, TContext, MethodName>, 'onLoading'>;

type BulkStatedDataReducerWithoutOnLoading<
  TMainConfig extends DataListMainTypeScope
> = Omit<BulkStatedDataReducer<TMainConfig>, 'onLoading'>;

export type EntityStatus = Prettify<Omit<StatedData<unknown>, 'result'>>;
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
export type MethodStatus<MethodName extends string> = Partial<
  Record<MethodName, EntityStatus>
>;

export type EntityReducerConfig<TData, TContext, MethodName extends string> = {
  entityStatedData: StatedData<TData>;
  reducer: StatedDataReducer<TData, TContext, MethodName> | undefined;
  entityIdSelector: IdSelector<TData>;
};

export type EntityStateByMethodObservable<TData, TContext> = Observable<
  Record<
    MethodName,
    {
      [x: string]: EntityReducerConfig<TData, TContext, MethodName>;
    }
  >
>[];

export type BulkReducerConfig<TMainConfig extends DataListMainTypeScope> = {
  entitiesStatedData: StatedData<TMainConfig['entity'][]>;
  reducer: BulkStatedDataReducer<TMainConfig> | undefined;
  entityIdSelector: IdSelector<TMainConfig['entity']>;
};

export type BulkStateByMethodObservable<
  TMainConfig extends DataListMainTypeScope
> = TMainConfig['bulkActions'] extends string
  ? Observable<
      Record<TMainConfig['bulkActions'], BulkReducerConfig<TMainConfig>>
    >[]
  : never[];

export type ContextualEntities<TData, MethodName extends string> = {
  entities: Prettify<EntityWithStatus<TData, MethodName>>[];
  outOfContextEntities: Prettify<EntityWithStatus<TData, MethodName>>[];
};

export type StatedEntities<
  TData,
  MethodName extends string,
  TContext
> = StatedData<
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
  Prettify<
    ContextualEntitiesWithSelectors<TData, MethodName, TEntitySelectors> & {
      context: TContext | undefined;
      /**
       * Selectors that are used to select the entities in the store
       */
      selectors: Prettify<TStoreSelectors>;
    }
  >
>;

type ContextualEntitiesWithSelectors<
  TData,
  MethodName extends string,
  TEntitySelectors
> = {
  entities: Prettify<
    EntityWithStatusWithSelectors<TData, MethodName, TEntitySelectors>
  >[];
  outOfContextEntities: Prettify<
    EntityWithStatusWithSelectors<TData, MethodName, TEntitySelectors>
  >[];
};

export type DelayedReducer<TData, TContext, MethodName extends string> = {
  reducer: StatedDataReducerWithoutOnLoading<TData, TContext, MethodName>;
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
  TData,
  TEntityLevelActionsKeys extends string,
  TContext,
  TEntitySelectors,
  TStoreSelectors
> = Observable<
  Prettify<
    StatedEntitiesWithSelectors<
      TData,
      TEntityLevelActionsKeys,
      TContext,
      TEntitySelectors,
      TStoreSelectors
    >
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

export type WithSelectors<TMainConfig extends DataListMainTypeScope> = {
  // todo make it optional
  entityLevel?: (
    params: EntityWithStatus<TMainConfig['entity'], TMainConfig['actions']> & {
      context: TMainConfig['pagination'];
    }
  ) => Record<string, unknown>;
  storeLevel?: (
    params: ContextualEntities<
      TMainConfig['entity'],
      TMainConfig['actions']
    > & {
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
  return map(
    (
      acc: StatedEntities<
        TMainConfig['entity'],
        TMainConfig['actions'],
        TMainConfig['pagination']
      >
    ) => ({
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
    })
  );
}

export function applyActionOnEntities<
  TData,
  SrcContext,
  MethodName extends string
>({
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

function applyBulkActionOnEntities<TMainConfig extends DataListMainTypeScope>({
  acc,
  bulkAction,
  context,
}: {
  acc: StatedEntities<
    TMainConfig['entity'],
    NonNullable<TMainConfig['bulkActions']> &
      NonNullable<TMainConfig['actions']>,
    TMainConfig['pagination']
  >;
  bulkAction: Record<
    NonNullable<TMainConfig['bulkActions']>,
    BulkReducerConfig<TMainConfig>
  >;
  context: TMainConfig['pagination'];
}): StatedEntities<
  TMainConfig['entity'],
  NonNullable<TMainConfig['bulkActions']> & NonNullable<TMainConfig['actions']>,
  TMainConfig['pagination']
> {
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

  const updatedEntities: EntityWithStatus<
    TMainConfig['entity'],
    NonNullable<TMainConfig['bulkActions']> &
      NonNullable<TMainConfig['actions']>
  >[] = previousEntitiesWithStatus.map((previousEntityWithStatus) => {
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

export function connectAssociatedDelayedReducer$<
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
