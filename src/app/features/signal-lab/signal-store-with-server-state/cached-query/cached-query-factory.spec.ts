import { signalStore, withState } from '@ngrx/signals';
import { Equal, Expect } from '../../../../../../test-type';
import { cachedQueryKeysFactory } from './cached-query-factory';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { rxQuery } from '../rx-query';

// par défault inmemory cache
describe('Cached Query Factory', () => {
  it('should create a cached query and return an highly typed output', () => {
    // should export the withUserQuery and userQueryMutation
    const data = cachedQueryKeysFactory({
      query: {
        user: true,
      },
      queryById: {
        users: true,
        customUsers: {
          cacheTime: 20, // Custom cache time for this query
        },
        customUsers2: {
          cacheTime: 500, // Custom cache time for this query
        },
      },
    });

    type ExpectQueryKeysToBeLiterals = Expect<
      Equal<
        keyof typeof data,
        'user' | 'users' | 'customUsers' | 'customUsers2'
      >
    >;

    const t = data['user'].cacheTime;

    type ExpectQueryKeysToBeAssociatedWithTheCachedConfig = Expect<
      Equal<
        (typeof data)['user'],
        {
          cacheTime: 300000; // 5 minutes
        }
      >
    >;

    type ExpectCustomUsersQueryToBeAssociatedWithHisCustomCachedConfig = Expect<
      Equal<
        (typeof data)['customUsers'],
        {
          cacheTime: 20; // 20ms
        }
      >
    >;
    type ExpectCustomUsers2QueryToBeAssociatedWithHisCustomCachedConfig =
      Expect<
        Equal<
          (typeof data)['customUsers2'],
          {
            cacheTime: 500; // 500ms
          }
        >
      >;

    expect(data.user).toBeDefined();
    expect(data.user.cacheTime).toEqual(300000);
    expect(data.users.cacheTime).toEqual(300000);
    expect(data.customUsers.cacheTime).toEqual(20);
    expect(data.customUsers2.cacheTime).toEqual(500);
  });

  it('should create a cached query and return a withFeatureQuery that can be used in signalStore and a queryMutation that can be used to mutate the query', () => {
    // should export the withUserQuery and userQueryMutation
    const data = cachedQueryKeysFactory({
      query: {
        user: true,
      },
      // queryById: {
      //   users: true,
      //   customUsers: {
      //     cacheTime: 20, // Custom cache time for this query
      //   },
      //   customUsers2: {
      //     cacheTime: 500, // Custom cache time for this query
      //   },
      // },
    });

    type ExpectQueryKeysToBeLiterals = Expect<
      Equal<keyof typeof data, 'withUserQuery' | 'userQueryMutation'>
    >;

    const { withUserQuery, userQueryMutation } = data;

    signalStore(
      withState({ selected: '1' }),
      withUserQuery('test', (store) =>
        rxQuery({
          params: store.selected,
          stream: () => of({ id: '4', name: 'test' }),
        })
      )
    );

    // type ExpectQueryKeysToBeAssociatedWithTheCachedConfig = Expect<
    //   Equal<
    //     (typeof data)['user'],
    //     {
    //       cacheTime: 300000; // 5 minutes
    //     }
    //   >
    // >;

    // type ExpectCustomUsersQueryToBeAssociatedWithHisCustomCachedConfig = Expect<
    //   Equal<
    //     (typeof data)['customUsers'],
    //     {
    //       cacheTime: 20; // 20ms
    //     }
    //   >
    // >;
    // type ExpectCustomUsers2QueryToBeAssociatedWithHisCustomCachedConfig =
    //   Expect<
    //     Equal<
    //       (typeof data)['customUsers2'],
    //       {
    //         cacheTime: 500; // 500ms
    //       }
    //     >
    //   >;

    // expect(data.user).toBeDefined();
    // expect(data.user.cacheTime).toEqual(300000);
    // expect(data.users.cacheTime).toEqual(300000);
    // expect(data.customUsers.cacheTime).toEqual(20);
    // expect(data.customUsers2.cacheTime).toEqual(500);
  });
});
