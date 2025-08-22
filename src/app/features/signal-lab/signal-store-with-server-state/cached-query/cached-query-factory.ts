import {
  Prettify,
  SignalStoreFeatureResult,
  StateSignals,
  WritableStateSource,
} from '@ngrx/signals';
import { rxQuery } from '../rx-query';
import { InternalType, MergeObjects } from '../types/util.type';
import { QueryOptions, QueryRef, withQuery } from '../with-query';

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
  [k in keyof QueryRecord as `with${Capitalize<
    string & k
  >}Query`]: typeof withQuery;
};

type QueryOutput<
  QueryKeys extends keyof QueryRecord,
  QueryRecord extends {
    [key in QueryKeys]: CachedQuery;
  },
  CacheTime
> = MergeObjects<
  [
    WithQueryOutputMapper<QueryKeys, QueryRecord>,
    {
      [k in keyof QueryRecord as `${k & string}QueryMutation`]: true;
      // {
      //   cacheTime: QueryRecord[k]['cacheTime'] extends number
      //     ? QueryRecord[k]['cacheTime']
      //     : CacheTime;
      // };
    }
  ]
>;

type QueryCacheCustomConfig = {
  cacheTime: number;
};

type CachedQueryFactoryOutput<
  QueryKeys extends keyof QueryRecord,
  QueryByIdKeys extends keyof QueryByIdRecord,
  QueryRecord extends {
    [key in QueryKeys]: CachedQuery;
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
      ? QueryOutput<QueryKeys, QueryRecord, CacheTime>
      : {},
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
  const QueryRecord extends { [key in QueryKeys]: CachedQuery },
  const QueryByIdRecord extends {
    [key in QueryByIdKeys]: QueryCacheCustomConfig;
  },
  const CacheTime = 300000 // Default cache time in milliseconds (5 minutes)
>(
  {
    query,
    queryById,
  }: {
    query?: QueryRecord;
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
    ...(query && {
      ...Object.entries<QueryCacheCustomConfig>(query).reduce(
        (acc, [key, value]) => {
          const capitalizedKey = (key.charAt(0).toUpperCase() +
            key.slice(1)) as Capitalize<QueryKeys & string>;
          const withQueryName = `with${capitalizedKey}Query` as const;
          // @ts-ignore
          acc[withQueryName] = withQuery;
          return acc;
        },
        {} as WithQueryOutputMapper<QueryKeys, QueryRecord>
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
    QueryRecord,
    CacheTime,
    QueryByIdRecord
  >;
}
