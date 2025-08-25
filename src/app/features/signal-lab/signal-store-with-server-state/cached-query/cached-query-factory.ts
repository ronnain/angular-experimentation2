import { inject, Injector, runInInjectionContext, signal } from '@angular/core';
import {
  createSignalProxy,
  SignalProxy,
  SignalWrapperParams,
} from '../signal-proxy';
import {
  __INTERNAL_QueryBrand,
  HasQueryBrand,
  isBrandQueryFn,
} from '../types/brand';
import { InternalType, MergeObjects } from '../types/util.type';
import { QueryRef } from '../with-query';
import {
  withCachedQueryFactory,
  withCachedQueryToPlugFactory,
} from './with-cached-query-factory';
import { QueriesPersister } from '../persister/persister.type';

// todo expose enable to cache inmemory by default or use a persister or a persister to a specific query

type QueryRefType = {
  queryRef: QueryRef<unknown, unknown>;
  __types: InternalType<unknown, unknown, unknown, false>;
};

type CachedQuery = {
  config?: QueryCacheCustomConfig;
  query: QueryRefType;
};

type WithQueryOutputMapper<
  QueryRecord extends Record<string, QueryConfiguration<{}>>
> = {
  [k in keyof QueryRecord as `with${Capitalize<string & k>}Query`]: ReturnType<
    typeof withCachedQueryFactory<
      k & string,
      CachedQuery['query']['queryRef']['resource'],
      string
    >
  >;
};

type QueryCacheCustomConfig = {
  cacheTime: number;
};

type WithQueryOutputMapperTyped<
  QueryKeys extends keyof QueryRecord,
  QueryRecord extends {
    [key in QueryKeys]: { query: unknown };
  },
  k extends keyof QueryRecord
> = HasQueryBrand<QueryRecord[k]['query']> extends true
  ? QueryRecord[k]['query'] extends (store: any, context: any) => infer R
    ? R extends {
        queryRef: QueryRef<infer State, infer Params>;
      }
      ? ReturnType<
          typeof withCachedQueryFactory<
            k & string,
            State extends object | undefined ? State : never,
            Params
          >
        >
      : QueryRecord[k]['query']
    : 'never4'
  : QueryRecord[k]['query'] extends infer All
  ? All extends (
      data: SignalWrapperParams<infer PluggableParams>
    ) => (store: any, context: any) => infer R
    ? R extends {
        queryRef: QueryRef<infer State, infer Params>;
      }
      ? ReturnType<
          typeof withCachedQueryToPlugFactory<
            k & string,
            State extends object | undefined ? State : never,
            Params,
            PluggableParams
          >
        >
      : 'never2'
    : 'never2'
  : 'never1';

type CachedQueryFactoryOutput<
  QueryKeys extends keyof QueryRecord,
  QueryByIdKeys extends keyof QueryByIdRecord,
  QueryRecord extends {
    [key in QueryKeys]: {
      isPluggable?: true | false;
      query:
        | QueryRefType
        | ((data: SignalProxy<PluggableParams>) => QueryRefType);
    };
  },
  CacheTime, // Default cache time in milliseconds (5 minutes)
  QueryByIdRecord extends {
    [key in QueryByIdKeys]: {
      cacheTime: number;
    };
  },
  PluggableParams extends object
> = MergeObjects<
  [
    QueryKeys extends string
      ? {
          [k in keyof QueryRecord as `with${Capitalize<
            string & k
          >}Query`]: WithQueryOutputMapperTyped<QueryKeys, QueryRecord, k>;
        }
      : {},
    {
      [k in keyof QueryRecord as `test${Capitalize<
        string & k
      >}Query`]: QueryRecord[k] extends (store: any, context: any) => infer R
        ? R extends { queryRef: QueryRef<infer State, infer Params> }
          ? State
          : never
        : never;
    },
    QueryByIdKeys extends string
      ? {
          [k in keyof QueryByIdRecord]: {
            cacheTime: QueryByIdRecord[k]['cacheTime'] extends number
              ? QueryByIdRecord[k]['cacheTime']
              : CacheTime;
          };
        }
      : {}
  ]
>;

type QueryConfiguration<PluggableParams extends object> = {
  config?: QueryCacheCustomConfig;
  query: () =>
    | QueryRefType
    | ((data: SignalProxy<PluggableParams>) => QueryRefType);
};

export function cachedQueryKeysFactory<
  const QueryKeys extends keyof QueryRecord,
  const QueryByIdKeys extends keyof QueryByIdRecord,
  PluggableParams extends object,
  const QueryRecord extends {
    [key in QueryKeys]: QueryConfiguration<PluggableParams>;
  },
  const QueryByIdRecord extends {
    [key in QueryByIdKeys]: QueryCacheCustomConfig;
  },
  const CacheTime = 300000 // Default cache time in milliseconds (5 minutes)
>(
  {
    queries,
    queryById,
  }: {
    queries?: QueryRecord;
    queryById?: QueryByIdRecord;
  },
  cacheGlobalConfig?: {
    /**
     * Default cache time in milliseconds.
     * This is the time after which the cached data will be considered stale and eligible for garbage collection.
     * If not specified, the default is 5 minutes (300000 ms).
     */
    cacheTime?: CacheTime;
    persister?: QueriesPersister;
    featureName?: string;
  }
): CachedQueryFactoryOutput<
  QueryKeys,
  QueryByIdKeys,
  //@ts-ignore
  QueryRecord,
  CacheTime,
  QueryByIdRecord,
  PluggableParams
> {
  // l'idée retourner un objet avec les withXQuery, mais ce sont des fonctions vides
  // qui seront utilisées pour typer les signalStore
  // rtourner aussi un provideCachedQuery
  // Qui quand il est run va assigner les fonction withXQuery avec les vrais withXQuery
  const queriesMap = Object.entries(queries ?? {}).reduce((acc, [key]) => {
    const capitalizedKey = (key.charAt(0).toUpperCase() +
      key.slice(1)) as Capitalize<QueryKeys & string>;
    const withQueryName = `with${capitalizedKey}Query` as const;
    acc[withQueryName] = () => {};
    return acc;
  }, {} as Record<string, () => void>);
  return {
    ...(queries && {
      ...Object.entries<QueryConfiguration<PluggableParams>>(queries).reduce(
        (acc, [key, value]) => {
          const queryData = (injector: Injector) => {
            return runInInjectionContext(injector, () => {
              const capitalizedKey = (key.charAt(0).toUpperCase() +
                key.slice(1)) as Capitalize<QueryKeys & string>;
              const withQueryName = `with${capitalizedKey}Query` as const;
              console.log('value', isBrandQueryFn(value.query), key);
              const isPluggableQuery = !isBrandQueryFn(value.query);
              const queryData = (
                isPluggableQuery
                  ? ((value.query as any)(signalProxy) as any)({}, {})
                  : (value.query as any)?.({}, {})
              ) as QueryRefType;
              //@ts-ignore
              const queryRef = queryData.queryRef;
              const queryResource = queryRef.resource;
              const queryResourceParamsSrc = queryRef.resourceParamsSrc;
              cacheGlobalConfig?.persister?.addQueryToPersist({
                key,
                queryResource,
                queryResourceParamsSrc,
                waitForParamsSrcToBeEqualToPreviousValue: false,
                cacheTime:
                  value?.config?.cacheTime ??
                  (cacheGlobalConfig?.cacheTime as number | undefined) ??
                  300000,
              });
              return queryData;
            });
          };
          const signalProxy = createSignalProxy(signal({})) as any;

          const queryEntity = withCachedQueryToPlugFactory(
            key,
            signalProxy,
            queryData as any
          );
          // const queryEntity = isBrandQueryFn(queryData)
          //   ? withCachedQueryFactory(key, queryData as any)
          //   : withCachedQueryToPlugFactory(
          //       key,
          //       signalProxy,
          //       queryData as any
          //     );
          //@ts-ignore
          // todo get withQueryName
          acc['withUserQuery'] = queryEntity;

          return acc;
        },
        {} as WithQueryOutputMapper<Record<string, QueryConfiguration<{}>>>
      ),
    }),
    ...(queryById && {
      ...Object.entries<QueryCacheCustomConfig>(queryById).reduce(
        (acc, [key, value]) => {
          acc[key as keyof QueryByIdRecord] = {
            cacheTime:
              value.cacheTime ?? cacheGlobalConfig?.cacheTime ?? 300000,
          };
          return acc;
        },
        {} as { [k in keyof QueryByIdRecord]: { cacheTime: number } }
      ),
    }),
  } as CachedQueryFactoryOutput<
    QueryKeys,
    QueryByIdKeys,
    //@ts-ignore
    QueryRecord,
    CacheTime,
    QueryByIdRecord,
    PluggableParams
  >;
}

export function assignRealQuery(fn: () => {}, realQuery: any): () => {} {
  return Object.assign(fn, realQuery);
}
