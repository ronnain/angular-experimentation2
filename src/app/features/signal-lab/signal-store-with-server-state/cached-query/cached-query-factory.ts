type QueryCacheCustomConfig = {
  cacheTime: number;
};

type CachedQueryFactoryOutput<
  QueryKeys extends keyof QueryRecord,
  QueryByIdKeys extends keyof QueryByIdRecord,
  QueryRecord extends {
    [key in QueryKeys]: QueryCacheCustomConfig;
  },
  CacheTime, // Default cache time in milliseconds (5 minutes)
  QueryByIdRecord extends {
    [key in QueryByIdKeys]: {
      cacheTime: number;
    };
  }
> = {
  [k in keyof QueryRecord]: {
    cacheTime: QueryRecord[k]['cacheTime'] extends number
      ? QueryRecord[k]['cacheTime']
      : CacheTime;
  };
} & {
  [k in keyof QueryByIdRecord]: {
    cacheTime: QueryByIdRecord[k]['cacheTime'] extends number
      ? QueryByIdRecord[k]['cacheTime']
      : CacheTime;
  };
};

export function cachedQueryKeysFactory<
  const QueryKeys extends keyof QueryRecord,
  const QueryByIdKeys extends keyof QueryByIdRecord,
  const QueryRecord extends { [key in QueryKeys]: QueryCacheCustomConfig },
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
  return {
    ...(query && {
      ...Object.entries<QueryCacheCustomConfig>(query).reduce(
        (acc, [key, value]) => {
          acc[key as keyof QueryRecord] = {
            cacheTime:
              value.cacheTime ?? cacheGlobalConfig?.cacheTime ?? 300000,
          };
          return acc;
        },
        {} as { [k in keyof QueryRecord]: { cacheTime: number } }
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
