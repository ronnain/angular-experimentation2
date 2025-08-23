import { signalStore, withState } from '@ngrx/signals';
import { Equal, Expect } from '../../../../../../test-type';
import { cachedQueryKeysFactory } from './cached-query-factory';
import { of } from 'rxjs';
import { rxQuery } from '../rx-query';
import { ResourceRef, Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { query } from '../query';
import { withMutation } from '../with-mutation';
import { rxMutation } from '../rx-mutation';
import { SignalProxy } from '../signal-proxy';

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

  it('should create a cached query and return a withFeatureQuery that can be used in signalStore', async () => {
    await TestBed.runInInjectionContext(async () => {
      // should export the withUserQuery and userQueryMutation

      const data = cachedQueryKeysFactory({
        queries: {
          user: {
            query: rxQuery({
              // todo pluggeable query
              // todo propose a way to inject service for the api call
              params: () => ({
                id: '1',
              }),
              stream: () => of({ id: '1', name: 'User 1' }),
            }),
          },
        },
      });
      console.log('data', data);

      type ExpectQueryKeysToBeLiterals = Expect<
        Equal<'withUserQuery' extends keyof typeof data ? true : false, true>
      >;

      const { withUserQuery, testUserQuery } = data;

      expect(typeof withUserQuery).toEqual('function');

      const testSignalStore = signalStore(
        { providedIn: 'root' },
        withState({ selected: '1' }),
        withMutation('name', () =>
          rxMutation({
            method: (name: string) => name,
            stream: ({ params }) => of({ id: '4', name: params }),
          })
        ),
        withUserQuery((store) => ({
          on: {
            nameMutation: {},
          },
        }))
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
  });

  it('should create a cached query and return a withFeatureQuery that can be used plug within the signalStore', async () => {
    await TestBed.runInInjectionContext(async () => {
      // should export the withUserQuery and userQueryMutation

      const data = cachedQueryKeysFactory({
        queries: {
          user: {
            // todo propose a way to inject service for the api call
            // todo maybe a brand to the rxQuery to detect if it is a pluggable query or not
            // todo creer un adaptateur pour ne pas avoir à utiliser le withUserQuery depuis un composant pour récupéer l'id dans l'url
            // todo export injectSetUserQueryParams ? partial pour être dispo à plusieurs endroits ?
            query: (source: SignalProxy<{ id: string }>) =>
              rxQuery({
                // todo pluggable query, that are not mandatory to set
                // todo propose a way to inject service for the api call
                params: source.id,
                stream: ({ params: id }) => of({ id, name: 'User 1' }),
              }),
            isPluggable: true,
          },
        },
      });
      console.log('data', data);

      type ExpectQueryKeysToBeLiterals = Expect<
        Equal<'withUserQuery' extends keyof typeof data ? true : false, true>
      >;

      const { withUserQuery } = data;

      const t = withUserQuery;
      //.   ^?

      expect(typeof withUserQuery).toEqual('function');

      const testSignalStore = signalStore(
        { providedIn: 'root' },
        withState({ selected: '1' }),
        withMutation('name', () =>
          rxMutation({
            method: (name: string) => name,
            stream: ({ params }) => of({ id: '4', name: params }),
          })
        ),
        withUserQuery((store) => ({
          dataToPlug: { id: store.selected },
        }))
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
  });
});
