import { signalStore, withState } from '@ngrx/signals';
import { Equal, Expect } from '../../../../../../test-type';
import { cachedQueryKeysFactory } from './cached-query-factory';
import { of } from 'rxjs';
import { rxQuery } from '../rx-query';
import { ResourceRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { query } from '../query';

// par défault inmemory cache
describe('Cached Query Factory', () => {
  // xit('should create a cached query and return an highly typed output', () => {
  //   // should export the withUserQuery and userQueryMutation
  //   const data = cachedQueryKeysFactory({
  //     query: {
  //       user: true,
  //     },
  //     queryById: {
  //       users: true,
  //       customUsers: {
  //         cacheTime: 20, // Custom cache time for this query
  //       },
  //       customUsers2: {
  //         cacheTime: 500, // Custom cache time for this query
  //       },
  //     },
  //   });

  //   type ExpectQueryKeysToBeLiterals = Expect<
  //     Equal<
  //       keyof typeof data,
  //       'user' | 'users' | 'customUsers' | 'customUsers2'
  //     >
  //   >;

  //   const t = data['user'].cacheTime;

  //   type ExpectQueryKeysToBeAssociatedWithTheCachedConfig = Expect<
  //     Equal<
  //       (typeof data)['user'],
  //       {
  //         cacheTime: 300000; // 5 minutes
  //       }
  //     >
  //   >;

  //   type ExpectCustomUsersQueryToBeAssociatedWithHisCustomCachedConfig = Expect<
  //     Equal<
  //       (typeof data)['customUsers'],
  //       {
  //         cacheTime: 20; // 20ms
  //       }
  //     >
  //   >;
  //   type ExpectCustomUsers2QueryToBeAssociatedWithHisCustomCachedConfig =
  //     Expect<
  //       Equal<
  //         (typeof data)['customUsers2'],
  //         {
  //           cacheTime: 500; // 500ms
  //         }
  //       >
  //     >;

  //   expect(data.user).toBeDefined();
  //   expect(data.user.cacheTime).toEqual(300000);
  //   expect(data.users.cacheTime).toEqual(300000);
  //   expect(data.customUsers.cacheTime).toEqual(20);
  //   expect(data.customUsers2.cacheTime).toEqual(500);
  // });

  it('should create a cached query and return a withFeatureQuery that can be used in signalStore and a queryMutation that can be used to mutate the query', async () => {
    // should export the withUserQuery and userQueryMutation
    const data = cachedQueryKeysFactory({
      query: {
        user: rxQuery({
          // todo pluggeable query
          params: () => ({
            id: '1',
          }),
          stream: () => of({ id: '1', name: 'User 1' }),
        }),
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
    console.log('data', data);

    type ExpectQueryKeysToBeLiterals = Expect<
      Equal<keyof typeof data, 'withUserQuery' | 'userQueryMutation'>
    >;

    const { withUserQuery, userQueryMutation } = data;

    expect(typeof withUserQuery).toEqual('function');

    await TestBed.runInInjectionContext(async () => {
      const testSignalStore = signalStore(
        { providedIn: 'root' },
        withState({ selected: '1' }),
        withUserQuery('user', (store) =>
          rxQuery({
            params: store.selected,
            stream: () => of({ id: '4', name: 'test' }),
          })
        )
      );
      const store = TestBed.inject(testSignalStore);

      type ExpectQueryKeysToBeAssociatedWithTheCachedConfig = Expect<
        Equal<
          typeof store.userQuery,
          ResourceRef<{
            id: string;
            name: string;
          }>
        >
      >;

      expect(store.userQuery).toBeDefined();
    });

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
