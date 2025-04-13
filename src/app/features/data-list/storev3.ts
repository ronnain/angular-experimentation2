import {
  groupBy,
  map,
  merge,
  mergeMap,
  Observable,
  ObservedValueOf,
  of,
  scan,
  share,
  shareReplay,
  Subject,
  switchMap,
  tap,
  timer,
  withLatestFrom,
} from 'rxjs';
import { Merge } from '../../util/types/merge';
import {
  applyActionOnEntities,
  applyBulkActionOnEntities,
  applySelectors,
  bulkConnectAssociatedDelayedReducer$,
  BulkDelayedReducer,
  BulkReducerConfig,
  BulkStateByMethodObservable,
  BulkStatedDataReducer,
  connectAssociatedDelayedReducer$,
  ContextualEntities,
  DelayedReducer,
  EntityLevelActionConfig,
  EntityReducerConfig,
  EntityStateByMethodObservable,
  EntityWithStatus,
  FinalResult,
  IdSelector,
  MethodStatus,
  Operator,
  StatedData,
  StatedDataReducer,
  StatedEntities,
  WithSelectors,
} from './storev2';
import { statedStream } from '../../util/stated-stream/stated-stream';
import { Prettify } from '../../util/types/prettify';

export type DataListMainTypeScope = any extends {
  entity: any; // todo rename to entityType
  pagination?: any; // todo rename to srcContext
  actions: string;
  bulkActions?: string;
  selectors?: any;
}
  ? {
      entity: object;
      pagination?: unknown;
      actions: string;
      bulkActions?: string;
    }
  : never;
export type DataListStoreType<T extends DataListMainTypeScope> = T;

type WithEntities<TMainConfig extends DataListMainTypeScope> =
  (TMainConfig['pagination'] extends undefined ? {} : {}) & {
    src: () => Observable<TMainConfig['pagination']>;
    query: (params: {
      data: TMainConfig['pagination'];
    }) => Observable<TMainConfig['entity'][]>;
    initialData?: TMainConfig['entity'][];
    entityIdSelector: IdSelector<TMainConfig>;
  };

export function withEntities<TMainConfig extends DataListMainTypeScope>() {
  return (config: WithEntities<TMainConfig>) => ({ entitiesSrc: config });
}

type ActionConfig<TSrc, TMainConfig extends DataListMainTypeScope> = Merge<
  {
    src: () => Observable<TSrc>;
    query: (params: { actionSrc: TSrc }) => Observable<TMainConfig['entity']>;
    /**
     * Use switchMap as default, mergeMap is not recommended
     */
    operator: Operator;
    // todo pass an array (of an object with reducer and delayedreducer) that can enable to use reusable reducer
    reducer?: StatedDataReducer<TMainConfig>;
    delayedReducer?: DelayedReducer<TMainConfig>[];
  },
  TSrc extends TMainConfig['entity']
    ? {}
    : {
        /**
         * When the actionSrc data is not matching the entity type, this function is mandatory in order to know how to update optimistically the entity and to know which entity is affected.
         */
        optimisticEntity: (params: {
          actionSrc: TSrc;
        }) => TMainConfig['entity'];
      }
>;

export function action<TMainConfig extends DataListMainTypeScope>() {
  return <TSrc>(
    config: TMainConfig['actions'] extends undefined
      ? {}
      : ActionConfig<TSrc, TMainConfig>
  ) => config as ActionConfig<TSrc, TMainConfig>;
}

type WithBulkActions<TMainConfig extends DataListMainTypeScope> = {
  [key in NonNullable<TMainConfig['bulkActions']>]: BulkActionConfig<
    any,
    TMainConfig
  >;
};

type WithActions<TMainConfig extends DataListMainTypeScope> = {
  [key in TMainConfig['actions']]: ActionConfig<any, TMainConfig>;
};

export function withActions<TMainConfig extends DataListMainTypeScope>() {
  return (config: WithActions<TMainConfig>) => ({ actions: config });
}

export function bulkAction<TMainConfig extends DataListMainTypeScope>() {
  return <TSrc>(
    config: TMainConfig['bulkActions'] extends undefined
      ? {}
      : BulkActionConfig<TSrc, TMainConfig>
  ) => config as BulkActionConfig<TSrc, TMainConfig>;
}

type BulkActionConfig<
  TActionSrc,
  TMainConfig extends DataListMainTypeScope
> = Merge<
  {
    src: () => Observable<TActionSrc>;
    query: (params: {
      actionSrc: TActionSrc;
    }) => Observable<TMainConfig['entity'][]>;
    operator: Operator; //Use concatMap or exhaustMap as default (switchMap and mergeMap are not recommended), because, it ait is trigger a second time during the loading phase and if the list of the selected Id change, the removed selected id will be display as loading (it may be fixed)
    // todo pass an array (of an object with reducer and delayedreducer) that can enable to use reusable reducer
    reducer?: BulkStatedDataReducer<TMainConfig>;
    delayedReducer?: BulkDelayedReducer<TMainConfig>[];
  },
  TActionSrc extends TMainConfig['entity'][]
    ? {}
    : {
        /**
         * When the actionSrc data is not matching the entities type, this function is mandatory in order to know how to update optimistically the entities and to know which entities are affected.
         */
        optimisticEntities: (params: {
          actionSrc: TActionSrc;
        }) => TMainConfig['entity'][];
      }
>;

export function withBulkActions<TMainConfig extends DataListMainTypeScope>() {
  return (config: WithBulkActions<TMainConfig>) => ({ bulkActions: config });
}

export function withSelectors<TMainConfig extends DataListMainTypeScope>() {
  return <
    TEntitySelectorsKeys extends keyof ReturnType<TEntitySelectorsFn>,
    TEntitySelectorsFn extends (
      params: EntityWithStatus<TMainConfig> & {
        context: TMainConfig['pagination'];
      }
    ) => Record<TEntitySelectorsKeys, unknown>,
    TStoreSelectorsKeys extends keyof ReturnType<TStoreSelectorsFn>,
    TStoreSelectorsFn extends (
      params: ContextualEntities<TMainConfig> & {
        context: TMainConfig['pagination'];
      }
    ) => Record<TStoreSelectorsKeys, unknown>
  >(config: {
    entityLevel?: TEntitySelectorsFn;
    storeLevel?: TStoreSelectorsFn;
  }) =>
    ({
      selectors: config,
    } as const);
  // }) => ({ selectors: config as ReturnType<TStoreSelectorsFn> }) as const;
}

/////////////////

type StorePlugin =
  | {
      entitiesSrc: any;
    }
  | {
      actions: any;
    }
  | {
      bulkActions: any;
    }
  | {
      selectors: any;
    };

type MergePlugins<
  Plugins extends readonly StorePlugin[],
  Acc = {}
> = Plugins extends [infer First, ...infer Rest]
  ? First extends StorePlugin
    ? Rest extends StorePlugin[]
      ? MergePlugins<Rest, Merge<Acc, First>>
      : Merge<Acc, First>
    : never
  : Acc;

export function store<TMainConfig extends DataListMainTypeScope>() {
  return <
    Plugins extends readonly (
      | {
          entitiesSrc: WithEntities<TMainConfig>;
        }
      | {
          actions: WithActions<TMainConfig>;
        }
      | {
          selectors: WithSelectors<TMainConfig>;
        }
      | {
          bulkActions: WithBulkActions<TMainConfig>;
        }
    )[],
    TEntitySelectors extends MergePlugins<Plugins> extends {
      selectors?: any;
    }
      ? ReturnType<
          NonNullable<MergePlugins<Plugins>['selectors']['entityLevel']>
        >
      : undefined,
    TEntitiesSelectors extends MergePlugins<Plugins> extends {
      selectors?: any;
    }
      ? ReturnType<
          NonNullable<MergePlugins<Plugins>['selectors']['storeLevel']>
        >
      : undefined
  >(
    ...plugins: Plugins
  ) => {
    let base = {};

    for (const plugin of plugins) {
      base = {
        ...base,
        ...plugin,
      };
    }

    const configBase = base as {
      entitiesSrc: WithEntities<TMainConfig>;
      actions: WithActions<TMainConfig>;
      bulkActions: WithBulkActions<TMainConfig>;
      selectors: WithSelectors<TMainConfig>;
    };

    const entityIdSelector = configBase.entitiesSrc.entityIdSelector;

    const actionEvents = createActionEventSubjects<TMainConfig>(configBase);

    const events = {
      action: actionEvents,
    };

    const entityLevelActionList$: EntityStateByMethodObservable<TMainConfig> =
      Object.entries(
        (configBase.actions ?? {}) as Record<
          string,
          ActionConfig<any, TMainConfig>
        >
      ).reduce((acc, [methodName, groupByData]) => {
        const src$ = groupByData.src;
        const operatorFn = groupByData.operator;
        const api = groupByData.query; // todo rename variable
        const reducer = groupByData.reducer;
        const delayedReducer = groupByData.delayedReducer || [];
        const optimisticEntity =
          'optimisticEntity' in groupByData
            ? groupByData.optimisticEntity
            : undefined;

        const actionByEntity$: Observable<{
          [x: string]: {
            entityStatedData: StatedData<TMainConfig['entity']>;
            reducer: StatedDataReducer<TMainConfig> | undefined;
            entityIdSelector: IdSelector<TMainConfig>;
          };
        }> = src$().pipe(
          groupBy((actionSrc) =>
            entityIdSelector(
              optimisticEntity ? optimisticEntity({ actionSrc }) : actionSrc
            )
          ),
          mergeMap((groupedEntityById$) => {
            return groupedEntityById$.pipe(
              operatorFn((actionSrc) => {
                const entity = optimisticEntity
                  ? optimisticEntity({ actionSrc })
                  : actionSrc;

                return statedStream(api({ actionSrc }), entity).pipe(
                  map((entityStatedData) => ({
                    [entityIdSelector(entity)]: {
                      entityStatedData,
                      reducer,
                      entityIdSelector,
                    } satisfies EntityReducerConfig<TMainConfig>,
                  })),
                  switchMap((entityReducerConfigWithMethod) =>
                    connectAssociatedDelayedReducer$<TMainConfig>({
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
      }, [] as EntityStateByMethodObservable<TMainConfig>);

    const bulkActionsEntries = Object.entries(configBase.bulkActions ?? {}) as [
      NonNullable<TMainConfig['bulkActions']>,
      BulkActionConfig<any, TMainConfig>
    ][];
    const bulkActionsList$: BulkStateByMethodObservable<TMainConfig> =
      bulkActionsEntries.reduce((acc, [methodName, groupByData]) => {
        const src$ = groupByData.src();
        const operatorFn = groupByData.operator;
        const api = groupByData.query;
        const reducer = groupByData.reducer;
        const delayedReducer = groupByData.delayedReducer ?? [];
        const optimisticEntities =
          'optimisticEntities' in groupByData
            ? groupByData.optimisticEntities
            : undefined;

        const bulkActions$ = src$.pipe(
          operatorFn((actionSrc) => {
            const entities = optimisticEntities
              ? optimisticEntities({ actionSrc })
              : actionSrc;
            return statedStream(api({ actionSrc }), entities).pipe(
              map(
                (entitiesStatedData) =>
                  ({
                    entitiesStatedData,
                    reducer,
                    entityIdSelector,
                  } satisfies BulkReducerConfig<TMainConfig>)
              ),
              switchMap((bulkReducerConfig) =>
                bulkConnectAssociatedDelayedReducer$<TMainConfig>({
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
            map(
              (bulkReducerConfig) =>
                ({
                  [methodName]: bulkReducerConfig,
                } as Record<
                  // todo check to remove this as, maybe transform the Record to an object in the type
                  NonNullable<TMainConfig['bulkActions']>,
                  BulkReducerConfig<TMainConfig>
                >)
            )
          ),
        ] satisfies BulkStateByMethodObservable<TMainConfig>;
      }, [] as BulkStateByMethodObservable<TMainConfig>);

    const entitiesData$ = configBase.entitiesSrc.src().pipe(
      switchMap((srcContextValue) =>
        statedStream(
          configBase.entitiesSrc.query({ data: srcContextValue }),
          configBase.entitiesSrc.initialData ?? []
        )
      ),
      share()
    );

    // I choose to merge the entitiesData$ and the entityLevelActionList$, that's enable to add some items even if entities are not loaded yet
    const finalResult: FinalResult<
      TMainConfig,
      TEntitySelectors,
      TEntitiesSelectors
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
      withLatestFrom(configBase.entitiesSrc.src()),
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
                  } satisfies MethodStatus<TMainConfig>,
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
        } satisfies StatedEntities<TMainConfig> as StatedEntities<TMainConfig> // satisfies apply an as const effect
      ),
      applySelectors<TMainConfig, TEntitySelectors, TEntitiesSelectors>(
        configBase.selectors
      ), // apply selectors
      shareReplay(1)
    );

    return {
      data$: finalResult,
      events,
    } as {
      /**
       * prefer to subscribe to the data$ property using the async pipe like: @let data = data$ | async;
       */
      data$: Observable<ObservedValueOf<typeof finalResult>>;
      events: typeof events;
    };
  };
}

type ActionSubjectEvent<TMainConfig extends DataListMainTypeScope> = {
  statusType: 'loading' | 'loaded' | 'error';
  context: TMainConfig['pagination'];
  actionSrc: any;
  entityWithStatus: EntityWithStatus<TMainConfig>;
};

function createActionEventSubjects<
  TMainConfig extends DataListMainTypeScope
>(configBase: {
  actions: WithActions<TMainConfig>;
}): Record<TMainConfig['actions'], Subject<ActionSubjectEvent<TMainConfig>>> {
  return Object.entries(
    (configBase.actions ?? {}) as Record<
      TMainConfig['actions'],
      ActionConfig<any, TMainConfig>
    >
  ).reduce((acc, [actionName, actionConfig]) => {
    const name = actionName as TMainConfig['actions'];
    acc[name] = new Subject<ActionSubjectEvent<TMainConfig>>();
    return acc;
  }, {} as Record<TMainConfig['actions'], Subject<ActionSubjectEvent<TMainConfig>>>);
}
