import { InternalType, MergeObjects } from '../types/util.type';
import { QueryRef, withQuery } from '../with-query';
import { withCachedQueryFactory } from './with-cached-query-factory';

type QueryRefType = {
  queryRef: QueryRef<unknown, unknown>;
  __types: InternalType<unknown, unknown, unknown, false>;
};

type CachedQuery = {
  config?: QueryCacheCustomConfig;
  query: QueryRefType;
};

type WithQueryOutputMapper<
  QueryKeys extends keyof QueryRecord,
  QueryRecord extends {
    [key in QueryKeys]: CachedQuery;
  }
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
> = ReturnType<
  QueryRecord[k]['query'] extends (store: any, context: any) => infer R
    ? R extends {
        queryRef: QueryRef<infer State, infer Params>;
      }
      ? typeof withCachedQueryFactory<
          k & string,
          State extends object | undefined ? State : never,
          Params
        >
      : never
    : never
>;

type CachedQueryFactoryOutput<
  QueryKeys extends keyof QueryRecord,
  QueryByIdKeys extends keyof QueryByIdRecord,
  QueryRecord extends {
    [key in QueryKeys]: { query: unknown };
  },
  CacheTime, // Default cache time in milliseconds (5 minutes)
  QueryByIdRecord extends {
    [key in QueryByIdKeys]: {
      cacheTime: number;
    };
  }
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

export function cachedQueryKeysFactory<
  const QueryKeys extends keyof QueryRecord,
  const QueryByIdKeys extends keyof QueryByIdRecord,
  const QueryRecord extends {
    [key in QueryKeys]: {
      config?: QueryCacheCustomConfig;
      query: QueryRefType;
    };
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
  }
): CachedQueryFactoryOutput<
  QueryKeys,
  QueryByIdKeys,
  QueryRecord,
  CacheTime,
  QueryByIdRecord
> {
  // J'ai besoin de récupérer la resource, la source params, la source stream
  return {
    ...(queries && {
      ...Object.entries<CachedQuery>(queries).reduce((acc, [key, value]) => {
        const capitalizedKey = (key.charAt(0).toUpperCase() +
          key.slice(1)) as Capitalize<QueryKeys & string>;
        const withQueryName = `with${capitalizedKey}Query` as const;
        console.log('value', value);
        console.log(' value.query', value.query);
        // @ts-ignore
        acc[withQueryName] = withCachedQueryFactory(key, value.query);
        return acc;
      }, {} as WithQueryOutputMapper<QueryKeys, QueryRecord>),
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
    QueryRecord,
    CacheTime,
    QueryByIdRecord
  >;
}
