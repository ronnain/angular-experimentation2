import { Equal, Expect } from '../../../../../../test-type';
import { cachedQueryKeysFactory } from './cached-query-factory';

// par défault inmemory cache
describe('Cached Query Factory', () => {
  it('should create a cached query', () => {
    const cachedQueryKeys = cachedQueryKeysFactory({
      query: {
        user: true,
      },
      queryById: {
        users: true,
        customUsers: {
          cacheTime: 20 as const, // Custom cache time for this query
        },
        customUsers2: {
          cacheTime: 500 as const, // Custom cache time for this query
        },
      },
    });

    type ExpectQueryKeysToBeLiterals = Expect<
      Equal<
        keyof typeof cachedQueryKeys,
        'user' | 'users' | 'customUsers' | 'customUsers2'
      >
    >;

    type ExpectQueryKeysToBeAssociatedWithTheCachedConfig = Expect<
      Equal<
        (typeof cachedQueryKeys)['user'],
        {
          cacheTime: 300000; // 5 minutes
        }
      >
    >;

    type ExpectCustomUsersQueryToBeAssociatedWithHisCustomCachedConfig = Expect<
      Equal<
        (typeof cachedQueryKeys)['customUsers'],
        {
          cacheTime: 20; // 20ms
        }
      >
    >;
    type ExpectCustomUsers2QueryToBeAssociatedWithHisCustomCachedConfig =
      Expect<
        Equal<
          (typeof cachedQueryKeys)['customUsers2'],
          {
            cacheTime: 500; // 500ms
          }
        >
      >;

    expect(cachedQueryKeys.user).toBeDefined();
    expect(cachedQueryKeys.user.cacheTime).toEqual(300000);
    expect(cachedQueryKeys.users.cacheTime).toEqual(300000);
    expect(cachedQueryKeys.customUsers.cacheTime).toEqual(20);
    expect(cachedQueryKeys.customUsers2.cacheTime).toEqual(500);
  });
});
