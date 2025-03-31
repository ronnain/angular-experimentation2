import { Observable, of } from 'rxjs';
import { Merge } from '../../util/types/merge';
import { ContextualEntities, EntityWithStatus } from './storev2';

type DataListMainTypeScope = any extends {
  entity: any;
  pagination?: any;
  actions: string;
  selectors?: any;
}
  ? {
      entity: unknown;
      pagination?: unknown;
      actions: string;
    }
  : never;
type DataListStoreType<T extends DataListMainTypeScope> = T;
type MyDataListStoreType = DataListStoreType<{
  // autocompletion is enabled
  entity: {
    id: string;
    name: string;
  };
  pagination: {
    page: number;
  };
  actions: 'update' | 'delete';
}>;

type WithEntities<TMainConfig extends DataListMainTypeScope> =
  (TMainConfig['pagination'] extends undefined
    ? {}
    : {
        src: () => Observable<TMainConfig['pagination']>;
      }) & {
    query: (params: {
      data: TMainConfig['pagination'];
    }) => Observable<TMainConfig['entity']>;
  };

function withEntities<TMainConfig extends DataListMainTypeScope>() {
  return (config: WithEntities<TMainConfig>) => ({ entitiesSrc: config });
}

function action<TMainConfig extends DataListMainTypeScope>() {
  return <TSrc>(
    config: TMainConfig['actions'] extends undefined
      ? {}
      : {
          src: () => Observable<TSrc>;
          query: (params: { data: TSrc }) => Observable<TMainConfig['entity']>;
        }
  ) => config;
}

type WithActions<TMainConfig extends DataListMainTypeScope> = {
  [key in TMainConfig['actions']]: {
    src: () => any;
    query: (params: { data: any }) => Observable<TMainConfig['entity']>;
  };
};

function withActions<TMainConfig extends DataListMainTypeScope>() {
  return (config: WithActions<TMainConfig>) => ({ actions: config });
}

type WithSelectors<TMainConfig extends DataListMainTypeScope> = {
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

function withSelectors<TMainConfig extends DataListMainTypeScope>() {
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

function store<TMainConfig extends DataListMainTypeScope>() {
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
    )[]
  >(
    ...plugins: Plugins
  ): MergePlugins<Plugins> => {
    let base = {};

    for (const plugin of plugins) {
      base = {
        ...base,
        ...plugin,
      };
    }

    return base as MergePlugins<Plugins>;
  };
}
const result = store<MyDataListStoreType>()(
  withEntities<MyDataListStoreType>()({
    src: () =>
      of({
        page: 1,
      }),
    query: ({ data }) => of({ id: 'test', name: 'test' }),
  }),
  withActions<MyDataListStoreType>()({
    update: action<MyDataListStoreType>()({
      src: () => of({ id: 'test', name: 'test' }),
      query: ({ data }) => of({ id: 'test', name: 'test' }),
    }),
    delete: action<MyDataListStoreType>()({
      src: () => of({ id: 'test' }),
      query: ({ data }) => of({ id: 'test', name: 'test' }),
    }),
  }),
  withSelectors<MyDataListStoreType>()({
    entityLevel: (entityWithStatus) => {
      return {
        hasError: Object.values(entityWithStatus.status).some(
          (entityStatus) => entityStatus?.hasError
        ),
      };
    },
    storeLevel: (contextualEntities) => {
      return {
        hasErrorStore: Object.values(contextualEntities.entities).some(
          (entityWuthStatus) =>
            Object.values(entityWuthStatus.status).some(
              (entityStatus) => entityStatus?.hasError
            )
        ),
      };
    },
  })
);

const testStore = result.selectors.storeLevel?.({} as any)?.hasErrorStore;

const query = result.actions.update.query;
//     ^?

const selectors = withSelectors<MyDataListStoreType>()({
  entityLevel: (entityWithStatus) => {
    return {
      hasError: Object.values(entityWithStatus.status).some(
        (entityStatus) => entityStatus?.hasError
      ),
    } as const;
  },
  storeLevel: (contextualEntities) => {
    return {
      hasErrorStore: Object.values(contextualEntities.entities).some(
        (entityWuthStatus) =>
          Object.values(entityWuthStatus.status).some(
            (entityStatus) => entityStatus?.hasError
          )
      ),
    } as const;
  },
} as const);

const testSelectors = selectors.selectors.entityLevel?.({} as any);
