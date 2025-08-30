import { signalStore, withState } from '@ngrx/signals';
import { Equal, Expect } from '../../../../../../test-type';
import { globalQueries } from './global-queries';
import { of } from 'rxjs';
import { rxQuery } from '../rx-query';
import { inject, Injectable, ResourceRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { withMutation } from '../with-mutation';
import { rxMutation } from '../rx-mutation';
import { SignalProxy } from '../signal-proxy';
import { vi } from 'vitest';
import { rxQueryById } from '../rx-query-by-id';
import { ResourceByIdRef } from '../resource-by-id-signal-store';

// todo queryById
// todo expose inject funtion
describe('Global Queries', () => {
  it('should create a cached query and return a withFeatureQuery that can be used in signalStore', async () => {
    const data = globalQueries({
      queries: {
        user: {
          query: () =>
            rxQuery({
              params: () => ({
                id: '1',
              }),
              stream: () => of({ id: '1', name: 'User 1' }),
            }),
        },
      },
    });

    type ExpectQueryKeysToBeLiterals = Expect<
      Equal<'withUserQuery' extends keyof typeof data ? true : false, true>
    >;

    const { withUserQuery } = data;

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
    const data = globalQueries({
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
    const { withUserQuery } = globalQueries({
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
  });

  it('should create a cached query that can inject a service and be plugged within a signalStore', async () => {
    // should export the withUserQuery and userQueryMutation
    vi.useFakeTimers();

    @Injectable({ providedIn: 'root' })
    class ApiService {
      getUser() {
        return of({ id: '1', name: 'User 1' });
      }
    }

    const data = globalQueries({
      queries: {
        user: {
          query: (
            source: SignalProxy<{ id: string | undefined }>,
            api = inject(ApiService)
          ) =>
            rxQuery({
              params: source.id,
              stream: ({ params }) => {
                console.log('stream params', params);
                return api.getUser();
              },
            }),
        },
      },
    });

    type ExpectQueryKeysToBeLiterals = Expect<
      Equal<'withUserQuery' extends keyof typeof data ? true : false, true>
    >;

    const { withUserQuery } = data;

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
        setQuerySource: (source) => {
          type ExpectSourceToTyped = Expect<
            Equal<typeof source, SignalProxy<{ id: string | undefined }>>
          >;
          return {
            id: store.selected,
          };
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
    await vi.advanceTimersByTimeAsync(300);
    expect(store.userQuery.value()).toEqual({ id: '1', name: 'User 1' });
    vi.restoreAllMocks();
  });

  it('should create a cached query that can inject a service', async () => {
    // should export the withUserQuery and userQueryMutation
    vi.useFakeTimers();

    @Injectable({ providedIn: 'root' })
    class ApiService {
      getUser() {
        return of({ id: '1', name: 'User 1' });
      }
    }

    const source = signal({ id: 5 });
    const data = globalQueries({
      queries: {
        user: {
          query: (api = inject(ApiService)) =>
            rxQuery({
              params: source,
              stream: ({ params }) => {
                console.log('stream params', params);
                return api.getUser();
              },
            }),
        },
      },
    });

    type ExpectQueryKeysToBeLiterals = Expect<
      Equal<'withUserQuery' extends keyof typeof data ? true : false, true>
    >;

    const { withUserQuery } = data;

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
    await vi.advanceTimersByTimeAsync(300);
    expect(store.userQuery.value()).toEqual({ id: '1', name: 'User 1' });
    vi.restoreAllMocks();
  });

  it('should create a cached queryById that can be plug and return a withFeatureQueryById that can be used in signalStore', async () => {
    const data = globalQueries({
      queriesById: {
        user: {
          queryById: (source: SignalProxy<{ id: string | undefined }>) =>
            rxQueryById({
              params: source.id,
              stream: () => of({ id: '1', name: 'User 1' }),
              identifier: (params) => params,
            }),
        },
      },
    });

    type ExpectQueryKeysToBeLiterals = Expect<
      Equal<'withUserQueryById' extends keyof typeof data ? true : false, true>
    >;

    const { withUserQueryById } = data;

    const r = withUserQueryById;
    //    ^?

    expect(typeof withUserQueryById).toEqual('function');

    const testSignalStore = signalStore(
      { providedIn: 'root' },
      withState({ selected: '1' }),
      withMutation('name', () =>
        rxMutation({
          method: (name: string) => name,
          stream: ({ params }) => of({ id: '4', name: params }),
        })
      ),
      withUserQueryById((store) => ({
        setQuerySource: (source) => ({
          id: store.selected,
        }),
      }))
    );
    const store = TestBed.inject(testSignalStore);

    type ExpectUserQueryToBeTyped = Expect<
      Equal<
        typeof store.userQueryById,
        ResourceByIdRef<
          string,
          NoInfer<{
            id: string;
            name: string;
          }>
        >
      >
    >;

    expect(store.userQueryById).toBeDefined();
  });

  it('should create a cached queryById that is not pluggable and return a withFeatureQuery that can be used in signalStore', async () => {
    const data = globalQueries({
      queriesById: {
        user: {
          queryById: () =>
            rxQueryById({
              params: () => '1',
              stream: ({ params: id }) => of({ id, name: 'User ' + id }),
              identifier: (params) => params,
            }),
        },
      },
    });

    type ExpectQueryKeysToBeLiterals = Expect<
      Equal<'withUserQueryById' extends keyof typeof data ? true : false, true>
    >;

    const { withUserQueryById } = data;

    const r = withUserQueryById;
    //    ^?

    expect(typeof withUserQueryById).toEqual('function');

    const testSignalStore = signalStore(
      { providedIn: 'root' },
      withState({ selected: '1' }),
      withMutation('name', () =>
        rxMutation({
          method: (name: string) => name,
          stream: ({ params }) => of({ id: '4', name: params }),
        })
      ),
      withUserQueryById()
    );
    const store = TestBed.inject(testSignalStore);

    type ExpectUserQueryToBeTyped = Expect<
      Equal<
        typeof store.userQueryById,
        ResourceByIdRef<
          string,
          NoInfer<{
            id: string;
            name: string;
          }>
        >
      >
    >;

    expect(store.userQueryById).toBeDefined();
  });

  it('should export an injectQuery function that can be used in a component', async () => {
    const data = globalQueries({
      queries: {
        user: {
          query: () =>
            rxQuery({
              params: () => '1',
              stream: ({ params: id }) => of({ id, name: 'User ' + id }),
            }),
        },
      },
    });

    const { injectUserQuery } = data;

    const r = injectUserQuery((source) => ({ on }));
    //    ^?

    expect(typeof injectUserQuery).toEqual('function');

    const testSignalStore = signalStore(
      { providedIn: 'root' },
      withState({ selected: '1' }),
      withMutation('name', () =>
        rxMutation({
          method: (name: string) => name,
          stream: ({ params }) => of({ id: '4', name: params }),
        })
      ),
      withUserQueryById()
    );
    const store = TestBed.inject(testSignalStore);

    type ExpectUserQueryToBeTyped = Expect<
      Equal<
        typeof store.userQueryById,
        ResourceByIdRef<
          string,
          NoInfer<{
            id: string;
            name: string;
          }>
        >
      >
    >;

    expect(store.userQueryById).toBeDefined();
  });
});
