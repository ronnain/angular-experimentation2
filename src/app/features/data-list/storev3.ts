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
  switchMap,
  timer,
  withLatestFrom,
} from 'rxjs';
import { Merge } from '../../util/types/merge';
import {
  applyActionOnEntities,
  applySelectors,
  BulkActionConfig,
  bulkConnectAssociatedDelayedReducer$,
  BulkDelayedReducer,
  BulkReducerConfig,
  BulkStateByMethodObservable,
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
    entityIdSelector: IdSelector<TMainConfig['entity']>;
  };

export function withEntities<TMainConfig extends DataListMainTypeScope>() {
  return (config: WithEntities<TMainConfig>) => ({ entitiesSrc: config });
}

type ActionConfig<TSrc, TMainConfig extends DataListMainTypeScope> = {
  src: () => Observable<TSrc>;
  query: (params: { data: TSrc }) => Observable<TMainConfig['entity']>;
  operator: Operator; // Use switchMap as default, mergeMap is not recommended
  // todo pass an array (of an object with reducer and delayedreducer) that can enable to use reusable reducer
  reducer?: StatedDataReducer<
    TMainConfig['entity'],
    TMainConfig['pagination'],
    TMainConfig['actions']
  >;
  delayedReducer?: DelayedReducer<
    NoInfer<TMainConfig['entity']>,
    TMainConfig['pagination'],
    TMainConfig['actions']
  >[];
};

export function action<TMainConfig extends DataListMainTypeScope>() {
  return <TSrc>(
    config: TMainConfig['actions'] extends undefined
      ? {}
      : ActionConfig<TSrc, TMainConfig>
  ) => config as ActionConfig<TSrc, TMainConfig>;
}

type BulkActionConfig<TSrc, TMainConfig extends DataListMainTypeScope> = {
  src: () => Observable<TSrc>;
  query: (params: { data: TSrc }) => Observable<TMainConfig['entity'][]>;
  operator: Operator; //Use concatMap or exhaustMap as default (switchMap and mergeMap are not recommended), because, it ait is trigger a second time during the loading phase and if the list of the selected Id change, the removed selected id will be display as loading (it may be fixed)
  // todo pass an array (of an object with reducer and delayedreducer) that can enable to use reusable reducer
  reducer?: StatedDataReducer<
    TMainConfig['entity'],
    TMainConfig['pagination'],
    TMainConfig['actions']
  >;
  delayedReducer?: BulkDelayedReducer<TMainConfig>[];
};

export function withBulkAction<TMainConfig extends DataListMainTypeScope>() {
  return <TSrc>(
    config: TMainConfig['actions'] extends undefined
      ? {}
      : BulkActionConfig<TSrc, TMainConfig>
  ) => config as BulkActionConfig<TSrc, TMainConfig>;
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

export function withSelectors<TMainConfig extends DataListMainTypeScope>() {
  return <
    TEntitySelectorsKeys extends keyof ReturnType<TEntitySelectorsFn>,
    TEntitySelectorsFn extends (
      params: EntityWithStatus<
        TMainConfig['entity'],
        TMainConfig['actions']
      > & {
        context: TMainConfig['pagination'];
      }
    ) => Record<TEntitySelectorsKeys, unknown>,
    TStoreSelectorsKeys extends keyof ReturnType<TStoreSelectorsFn>,
    TStoreSelectorsFn extends (
      params: ContextualEntities<
        TMainConfig['entity'],
        TMainConfig['actions']
      > & {
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
      selectors: any;
    };

type MergePlugins<
  Plugins extends readonly (
    | {
        entitiesSrc: any;
      }
    | {
        actions: any;
      }
    | {
        selectors: any;
      }
  )[],
  Acc = {}
> = Plugins extends [infer First, ...infer Rest]
  ? First extends
      | {
          entitiesSrc: any;
        }
      | {
          actions: any;
        }
      | {
          selectors: any;
        }
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
      : null
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
    const events = {}; // todo

    const entityLevelActionList$: EntityStateByMethodObservable<
      TMainConfig['entity'],
      any
    > = Object.entries(
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

      const actionByEntity$: Observable<{
        [x: string]: {
          entityStatedData: StatedData<TMainConfig['entity']>;
          reducer:
            | StatedDataReducer<
                TMainConfig['entity'],
                TMainConfig['pagination'],
                TMainConfig['actions']
              >
            | undefined;
          entityIdSelector: IdSelector<TMainConfig['entity']>;
        };
      }> = src$().pipe(
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
                    TMainConfig['entity'],
                    TMainConfig['pagination'],
                    TMainConfig['actions']
                  >,
                })),
                switchMap((entityReducerConfigWithMethod) =>
                  connectAssociatedDelayedReducer$<
                    TMainConfig['entity'],
                    TMainConfig['pagination'],
                    TMainConfig['actions']
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
    }, [] as EntityStateByMethodObservable<TMainConfig['entity'], TMainConfig['pagination']>);

    const bulkActionsList$: BulkStateByMethodObservable<TMainConfig> =
      Object.entries(
        (configBase.bulkActions ?? {}) as Record<
          string,
          BulkActionConfig<any, TMainConfig>
        >
      ).reduce((acc, [methodName, groupByData]) => {
        const src$ = groupByData.src();
        const operatorFn = groupByData.operator;
        const api = groupByData.query;
        const reducer = groupByData.reducer;
        const delayedReducer = groupByData.delayedReducer ?? [];

        const bulkActions$ = src$.pipe(
          operatorFn((entities) => {
            return statedStream(api({ data: entities }), entities).pipe(
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
            map((bulkReducerConfig) => ({
              [methodName]: bulkReducerConfig,
            }))
          ),
        ];
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
      TMainConfig['entity'],
      TMainConfig['actions'] & TMainConfig['bulkActions'], //  | TBulkActionsKeys// todo for bulk
      TMainConfig['pagination'],
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
                  } satisfies MethodStatus<
                    TMainConfig['actions'] // | TBulkActionsKeys // todo bulk
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
          // if (action.type === 'bulkAction') { // todo bulk
          //   return applyBulkActionOnEntities({
          //     acc,
          //     bulkAction: action.data,
          //     context,
          //   });
          // }
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
          TMainConfig['entity'],
          TMainConfig['actions'],
          TMainConfig['pagination']
        > as StatedEntities<
          TMainConfig['entity'],
          TMainConfig['actions'],
          TMainConfig['pagination']
        > // satisfies apply an as const effect
      ),
      applySelectors<TMainConfig, TEntitySelectors, TEntitiesSelectors>(
        configBase.selectors
      ), // apply selectors
      shareReplay(1)
    );

    return {
      data$: finalResult,
    } as {
      /**
       * prefer to subscribe to the data$ property using the async pipe like: @let data = data$ | async;
       */
      data$: Observable<ObservedValueOf<typeof finalResult>>;
    };
  };
}
