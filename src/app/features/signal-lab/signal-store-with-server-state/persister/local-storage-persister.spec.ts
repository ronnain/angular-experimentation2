import { signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { delay, of } from 'rxjs';
import { localStoragePersister } from './local-storage-persister';
import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';

describe('localStoragePersister', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};

    const mockLocalStorage = {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach((k) => delete store[k]);
      }),
    };
    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('1 Should add a query to persist and store the query result in localStorage when the query is resolved', async () => {
    await TestBed.runInInjectionContext(async () => {
      const queryParamsFnSignal = signal<{ id: number } | undefined>(undefined);
      const queryResource = rxResource({
        params: queryParamsFnSignal,
        stream: ({ params }) => {
          return of({ id: params?.id, name: 'Romain' }).pipe(delay(10000));
        },
      });

      const persister = localStoragePersister('query-');

      persister.addQueryToPersist({
        key: 'user',
        queryResource,
        queryResourceParamsSrc: queryParamsFnSignal,
        waitForParamsSrcToBeEqualToPreviousValue: false,
      });
      expect(persister).toBeDefined();
      expect(localStorage.setItem).not.toHaveBeenCalled();

      queryParamsFnSignal.set({ id: 1 });
      expect(queryResource.status()).toBe('loading');
      await vi.runAllTimersAsync();

      expect(queryResource.status()).toBe('resolved');
      expect(queryResource.value()).toEqual({ id: 1, name: 'Romain' });
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'query-user',
        JSON.stringify({
          queryParams: { id: 1 },
          queryValue: { id: 1, name: 'Romain' },
        })
      );
    });
  });

  it('2 Should set the query resource value of a persisted value with the same query key', async () => {
    await TestBed.runInInjectionContext(async () => {
      localStorage.setItem(
        'query-user',
        JSON.stringify({
          queryParams: { id: 1 },
          queryValue: { id: 1, name: 'Romain' },
        })
      );
      const queryParamsFnSignal = signal<{ id: number } | undefined>(undefined);
      const queryResource = rxResource({
        params: queryParamsFnSignal,
        stream: ({ params }) => {
          return of({ id: params?.id, name: 'Romain' }).pipe(delay(10000));
        },
      });

      const persister = localStoragePersister('query-');

      persister.addQueryToPersist({
        key: 'user',
        queryResource,
        queryResourceParamsSrc: queryParamsFnSignal,
        waitForParamsSrcToBeEqualToPreviousValue: false,
      });
      expect(persister).toBeDefined();

      expect(queryResource.status()).toBe('local');
      expect(queryResource.value()).toEqual({ id: 1, name: 'Romain' });
      expect(localStorage.getItem).toHaveBeenCalledWith('query-user');
    });
  });

  it('3 Should clear the persisted query from localStorage', async () => {
    await TestBed.runInInjectionContext(async () => {
      localStorage.setItem(
        'query-user',
        JSON.stringify({
          queryParams: { id: 1 },
          queryValue: { id: 1, name: 'Romain' },
        })
      );
      const queryParamsFnSignal = signal<{ id: number } | undefined>(undefined);
      const queryResource = rxResource({
        params: queryParamsFnSignal,
        stream: ({ params }) => {
          return of({ id: params?.id, name: 'Romain' }).pipe(delay(10000));
        },
      });

      const persister = localStoragePersister('query-');

      persister.addQueryToPersist({
        key: 'user',
        queryResource,
        queryResourceParamsSrc: queryParamsFnSignal,
        waitForParamsSrcToBeEqualToPreviousValue: false,
      });
      expect(persister).toBeDefined();

      expect(queryResource.status()).toBe('local');
      expect(queryResource.value()).toEqual({ id: 1, name: 'Romain' });
      expect(localStorage.getItem).toHaveBeenCalledWith('query-user');
      persister.clearQuery('user');
      expect(localStorage.removeItem).toHaveBeenCalledWith('query-user');
    });
  });

  it('4 Should clear all the persisted queries from localStorage', async () => {
    await TestBed.runInInjectionContext(async () => {
      localStorage.setItem(
        'query-user',
        JSON.stringify({
          queryParams: { id: 1 },
          queryValue: { id: 1, name: 'Romain' },
        })
      );
      localStorage.setItem(
        'query-users',
        JSON.stringify({
          queryParams: { id: 1 },
          queryValue: [{ id: 1, name: 'Romain' }],
        })
      );
      const queryParamsFnSignal = signal<{ id: number } | undefined>(undefined);
      const queryResource = rxResource({
        params: queryParamsFnSignal,
        stream: ({ params }) => {
          return of({ id: params?.id, name: 'Romain' }).pipe(delay(10000));
        },
      });

      const queryUSersParamsFnSignal = signal<{ id: number } | undefined>(
        undefined
      );
      const queryUsersResource = rxResource({
        params: queryParamsFnSignal,
        stream: ({ params }) => {
          return of({ id: params?.id, name: 'Romain' }).pipe(delay(10000));
        },
      });

      const persister = localStoragePersister('query-');

      persister.addQueryToPersist({
        key: 'user',
        queryResource,
        queryResourceParamsSrc: queryParamsFnSignal,
        waitForParamsSrcToBeEqualToPreviousValue: false,
      });
      persister.addQueryToPersist({
        key: 'users',
        queryResource: queryUsersResource,
        queryResourceParamsSrc: queryUSersParamsFnSignal,
        waitForParamsSrcToBeEqualToPreviousValue: false,
      });
      expect(persister).toBeDefined();
      persister.clearAllQueries();
      expect(localStorage.removeItem).toHaveBeenCalledWith('query-user');
      expect(localStorage.removeItem).toHaveBeenCalledWith('query-users');
    });
  });

  it('5 Should wait for the params source to be defined and equal to previous value before retrieve the value', async () => {
    await TestBed.runInInjectionContext(async () => {
      localStorage.setItem(
        'query-user',
        JSON.stringify({
          queryParams: { id: 1 },
          queryValue: { id: 1, name: 'Romain' },
        })
      );

      const queryParamsFnSignal = signal<{ id: number } | undefined>(undefined);
      const queryResource = rxResource({
        params: queryParamsFnSignal,
        stream: ({ params }) => {
          return of({ id: params?.id, name: 'Romain' }).pipe(delay(10000));
        },
      });

      const persister = localStoragePersister('query-');

      persister.addQueryToPersist({
        key: 'user',
        queryResource,
        queryResourceParamsSrc: queryParamsFnSignal,
        waitForParamsSrcToBeEqualToPreviousValue: true,
      });

      expect(queryResource.value()).toEqual(undefined);
      queryParamsFnSignal.set({ id: 1 });
      expect(queryResource.status()).toBe('loading');
      TestBed.tick();
      expect(queryResource.status()).toBe('local');
      expect(queryResource.value()).toEqual({ id: 1, name: 'Romain' });
      expect(localStorage.getItem).toHaveBeenCalledWith('query-user');
    });
  });
  it('6 Should wait for the params source to be defined and not equal to previous value, so the value is not retrieved and the cache deleted', async () => {
    await TestBed.runInInjectionContext(async () => {
      localStorage.setItem(
        'query-user',
        JSON.stringify({
          queryParams: { id: 1 },
          queryValue: { id: 1, name: 'Romain' },
        })
      );

      const queryParamsFnSignal = signal<{ id: number } | undefined>(undefined);
      const queryResource = rxResource({
        params: queryParamsFnSignal,
        stream: ({ params }) => {
          return of({ id: params?.id, name: 'Romain' }).pipe(delay(10000));
        },
      });

      const persister = localStoragePersister('query-');

      persister.addQueryToPersist({
        key: 'user',
        queryResource,
        queryResourceParamsSrc: queryParamsFnSignal,
        waitForParamsSrcToBeEqualToPreviousValue: true,
      });

      expect(queryResource.value()).toEqual(undefined);
      queryParamsFnSignal.set({ id: 2 });
      expect(queryResource.status()).toBe('loading');
      TestBed.tick();
      expect(queryResource.status()).toBe('loading');
      expect(queryResource.value()).toEqual(undefined);
      expect(localStorage.removeItem).toHaveBeenCalledWith('query-user');
      expect(localStorage.getItem).toHaveBeenCalledWith('query-user');
      await vi.runAllTimersAsync();
      expect(queryResource.status()).toBe('resolved');
      expect(queryResource.value()).toEqual({ id: 2, name: 'Romain' });
    });
  });
});
