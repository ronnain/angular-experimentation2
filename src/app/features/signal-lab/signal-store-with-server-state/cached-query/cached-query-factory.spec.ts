import { signalStore, withState } from '@ngrx/signals';
import { Equal, Expect } from '../../../../../../test-type';
import { cachedQueryFactory } from './cached-query-factory';
import { of } from 'rxjs';
import { rxQuery } from '../rx-query';
import { ResourceRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { withMutation } from '../with-mutation';
import { rxMutation } from '../rx-mutation';
import { SignalProxy } from '../signal-proxy';

// todo par défault inmemory cache
// todo queryById
describe('Cached Query Factory', () => {
  it('should create a cached query and return a withFeatureQuery that can be used in signalStore', async () => {
    // should export the withUserQuery and userQueryMutation

    const data = cachedQueryFactory({
      queries: {
        user: {
          query: () =>
            rxQuery({
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

  it('should create a cached query and return a withFeatureQuery that can be used plug within the signalStore', async () => {
    const data = cachedQueryFactory({
      queries: {
        user: {
          query: (source: SignalProxy<{ id: string | undefined }>) =>
            rxQuery({
              params: source.id,
              stream: ({ params: id }) => of({ id, name: 'User 1' }),
            }),
        },
        users: {
          query: () =>
            rxQuery({
              stream: () => of({ id: '1', name: 'User 1' }),
            }),
        },
      },
    });
    console.log('data', data);

    // 👇 Check du typage
    type ExpectQueryKeysToBeLiterals = Expect<
      Equal<'withUserQuery' extends keyof typeof data ? true : false, true>
    >;

    const { withUserQuery, withUsersQuery } = data;

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
        setQuerySource: (source) => ({ id: store.selected }),
      })),
      withUsersQuery(() => ({}))
    );
    const store = TestBed.inject(testSignalStore);

    // 👇 Check du typage
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
    expect(store.usersQuery).toBeDefined();
  });
  it('withUserQuery can be inserted  within a signalStore', async () => {
    const { withUserQuery } = cachedQueryFactory({
      queries: {
        user: {
          query: (source: SignalProxy<{ id: string | undefined }>) =>
            rxQuery({
              params: source.id,
              stream: ({ params: id }) => of({ id, name: 'User 1' }),
            }),
        },
      },
    });

    const Store = signalStore(
      { providedIn: 'root' },
      withState({ selected: '1' }),
      withMutation('name', () =>
        rxMutation({
          method: (name: string) => name,
          stream: ({ params }) => of({ id: '4', name: params }),
        })
      ),
      withUserQuery((store) => ({
        setQuerySource: (source) => ({ id: store.selected }),
      }))
    );

    const store = TestBed.inject(Store);
    expect(store.userQuery).toBeDefined();

    // const Store = signalStore(
    //   { providedIn: 'root' },
    //   withState({ selected: '1' }),
    //   withMutation('name', () =>
    //     rxMutation({
    //       method: (name: string) => name,
    //       stream: ({ params }) => of({ id: '4', name: params }),
    //     })
    //   ),
    //   withUserQuery((store) => ({
    //     setQuerySource: (source) => ({ id: store.selected }),
    //   }))
    // );
    // await TestBed.runInInjectionContext(async () => {
    //   const store = TestBed.inject(Store);
    //   expect(store.userQuery).toBeDefined();
    //   expect(store.usersQuery).toBeDefined();
    // });
  });
});
