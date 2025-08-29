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
  withCachedQueryByIdToPlugFactory,
  withCachedQueryToPlugFactory,
} from './with-cached-query-factory';
import { QueriesPersister } from '../persister/persister.type';
import { QueryByIdRef } from '../with-query-by-id';

// todo expose enable to cache inmemory by default or use a persister or a persister to a specific query

type QueryRefType = {
  queryRef: QueryRef<unknown, unknown>;
  __types: InternalType<unknown, unknown, unknown, false>;
};

type QueryByIdRefType = {
  queryByIdRef: QueryByIdRef<string | number, unknown, unknown>;
  __types: InternalType<unknown, unknown, unknown, true, string | number>;
};

type CachedQuery = {
  config?: QueryCacheCustomConfig;
  query: QueryRefType;
};

type CachedQueryById = {
  config?: QueryCacheCustomConfig;
  query: QueryByIdRefType;
};

type WithQueryOutputMapper<
  QueryRecord extends Record<string, QueryConfiguration<{}>>
> = {
  [k in keyof QueryRecord as `with${Capitalize<string & k>}Query`]: ReturnType<
    typeof withCachedQueryToPlugFactory<
      k & string,
      CachedQuery['query']['queryRef']['resource'],
      string,
      {},
      true
    >
  >;
};

type WithQueryByIdOutputMapper<
  QueryRecord extends Record<string, QueryByIdConfiguration<{}>>
> = {
  [k in keyof QueryRecord as `with${Capitalize<
    string & k
  >}QueryById`]: ReturnType<
    typeof withCachedQueryByIdToPlugFactory<
      k & string,
      CachedQuery['query']['queryRef']['resource'],
      string,
      {},
      string | number,
      boolean
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
> = QueryRecord[k]['query'] extends infer All
  ? All extends (data: infer Data) => (store: any, context: any) => infer R
    ? R extends {
        queryRef: QueryRef<infer State, infer Params>;
      }
      ? Data extends SignalWrapperParams<infer PluggableParams>
        ? ReturnType<
            typeof withCachedQueryToPlugFactory<
              k & string,
              State extends object | undefined ? State : never,
              Params,
              PluggableParams,
              true
            >
          >
        : ReturnType<
            typeof withCachedQueryToPlugFactory<
              k & string,
              State extends object | undefined ? State : never,
              Params,
              {},
              false
            >
          >
      : 'never2Test'
    : `Error: Please use rxQuery or query. Eg: { ${k &
        string}: { query: () => rxQuery(...) }}`
  : 'never1';

type WithQueryByIdOutputMapperTyped<
  QueryByIdKeys extends keyof QueryByIdRecord,
  QueryByIdRecord extends {
    [key in QueryByIdKeys]: { queryById: unknown };
  },
  k extends keyof QueryByIdRecord
> = QueryByIdRecord[k]['queryById'] extends infer All
  ? All extends (data: infer Data) => (store: any, context: any) => infer R
    ? R extends {
        queryByIdRef: QueryByIdRef<
          infer GroupIdentifier,
          infer State,
          infer Params
        >;
      }
      ? Data extends SignalWrapperParams<infer PluggableParams>
        ? ReturnType<
            typeof withCachedQueryByIdToPlugFactory<
              k & string,
              State extends object | undefined ? State : never,
              Params,
              PluggableParams,
              GroupIdentifier,
              true
            >
          >
        : ReturnType<
            typeof withCachedQueryByIdToPlugFactory<
              k & string,
              State extends object | undefined ? State : never,
              Params,
              {},
              GroupIdentifier,
              false
            >
          >
      : 'never2'
    : `Error: Please use rxQueryById or queryById. Eg: { ${k &
        string}: { queryById: () => rxQueryById(...) }}`
  : 'never1';

type CachedQueryFactoryOutput<
  QueryKeys extends keyof QueryRecord,
  QueryByIdKeys extends keyof QueryByIdRecord,
  QueryRecord extends {
    [key in QueryKeys]: QueryConfiguration<PluggableParams>;
  },
  CacheTime, // Default cache time in milliseconds (5 minutes)
  QueryByIdRecord extends {
    [key in QueryByIdKeys]: QueryByIdConfiguration<PluggableParams>;
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
    QueryByIdKeys extends string
      ? {
          [k in keyof QueryByIdRecord as `with${Capitalize<
            string & k
          >}QueryById`]: WithQueryByIdOutputMapperTyped<
            QueryByIdKeys,
            QueryByIdRecord,
            k
          >;
        }
      : {}
  ]
>;

type QueryConfiguration<PluggableParams extends object> = {
  config?: QueryCacheCustomConfig;
  query: () =>
    | (() => QueryRefType)
    | ((data: SignalProxy<PluggableParams>) => QueryRefType);
};

type QueryByIdConfiguration<PluggableParams extends object> = {
  config?: QueryCacheCustomConfig;
  queryById: () =>
    | (() => QueryByIdRefType)
    | ((data: SignalProxy<PluggableParams>) => QueryByIdRefType);
};

export function cachedQueryFactory<
  const QueryKeys extends keyof QueryRecord,
  const QueryByIdKeys extends keyof QueryByIdRecord,
  PluggableParams extends object,
  const QueryRecord extends {
    [key in QueryKeys]: QueryConfiguration<PluggableParams>;
  },
  const QueryByIdRecord extends {
    [key in QueryByIdKeys]: QueryByIdConfiguration<PluggableParams>;
  },
  const CacheTime = 300000 // Default cache time in milliseconds (5 minutes)
>(
  {
    queries,
    queriesById,
  }: {
    queries?: QueryRecord;
    queriesById?: QueryByIdRecord;
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
  QueryRecord,
  CacheTime,
  QueryByIdRecord,
  PluggableParams
> {
  return {
    ...(queries && {
      ...Object.entries<QueryConfiguration<PluggableParams>>(queries).reduce(
        (acc, [key, value]) => {
          const capitalizedKey = (key.charAt(0).toUpperCase() +
            key.slice(1)) as Capitalize<QueryKeys & string>;
          const withQueryName = `with${capitalizedKey}Query` as const;

          const queryData = (injector: Injector) => {
            return runInInjectionContext(injector, () => {
              const isPluggableQuery = value.query.length > 0;
              console.log('isPluggableQuery', key, isPluggableQuery);
              const queryData = (
                isPluggableQuery
                  ? ((value.query as any)(signalProxy) as any)({}, {})
                  : (value.query as any)()?.({}, {})
              ) as QueryRefType;
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
          //@ts-ignore
          acc[withQueryName] = queryEntity;

          return acc;
        },
        {} as WithQueryOutputMapper<Record<string, QueryConfiguration<{}>>>
      ),
    }),
    ...(queriesById && {
      ...Object.entries<QueryByIdConfiguration<PluggableParams>>(
        queriesById
      ).reduce((acc, [key, value]) => {
        const capitalizedKey = (key.charAt(0).toUpperCase() +
          key.slice(1)) as Capitalize<QueryKeys & string>;
        const withQueryName = `with${capitalizedKey}QueryById` as const;

        const queryData = (injector: Injector) => {
          return runInInjectionContext(injector, () => {
            // todo check if the first arg is a service injected
            const isPluggableQuery = value.queryById.length > 0;
            console.log('isPluggableQuery', key, isPluggableQuery);
            const queryData = (
              isPluggableQuery
                ? ((value.queryById as any)(signalProxy) as any)({}, {})
                : (value.queryById as any)()?.({}, {})
            ) as QueryByIdRefType;
            const queryByRef = queryData.queryByIdRef;
            const queryByIdResource = queryByRef.resourceById;
            const queryResourceParamsSrc = queryByRef.resourceParamsSrc;
            cacheGlobalConfig?.persister?.addQueryByIdToPersist({
              key,
              queryByIdResource,
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

        const queryEntity = withCachedQueryByIdToPlugFactory(
          key,
          signalProxy,
          queryData as any
        );
        //@ts-ignore
        acc[withQueryName] = queryEntity;

        return acc;
      }, {} as WithQueryByIdOutputMapper<Record<string, QueryByIdConfiguration<{}>>>),
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
