import { delay, lastValueFrom, of } from 'rxjs';
import { Equal, Expect } from '../../../../../test-type';
import {
  signalStore,
  signalStoreFeature,
  SignalStoreFeature,
  withState,
} from '@ngrx/signals';
import { query, withQuery } from './with-query';
import { ResourceRef, ResourceStreamItem, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

type User = {
  id: string;
  name: string;
  email: string;
};

describe('withQuery', () => {
  it('Should expose a query resource', () => {
    const Store = signalStore(
      withQuery('user', () =>
        query({
          params: () => '5',
          loader: ({ params }) => {
            return lastValueFrom(
              of({
                id: params,
                name: 'John Doe',
                email: 'test@a.com',
              })
            );
          },
        })
      )
    );

    TestBed.configureTestingModule({
      providers: [Store],
    });
    const store = TestBed.inject(Store);

    expect(store.userQuery).toBeDefined();
  });

  it('should have idle state when query params are undefined', () => {
    const Store = signalStore(
      withQuery('user', () =>
        query({
          params: () => undefined,
          loader: ({ params }) => {
            return lastValueFrom(
              of({
                id: params,
                name: 'John Doe',
                email: 'test@a.com',
              })
            );
          },
        })
      )
    );

    TestBed.configureTestingModule({
      providers: [Store],
    });
    const store = TestBed.inject(Store);

    expect(store.userQuery.status()).toBe('idle');
  });

  it('should have loading state when query params are defined', () => {
    const Store = signalStore(
      withQuery('user', () =>
        query({
          params: () => '5',
          loader: ({ params }) => {
            return lastValueFrom(
              of({
                id: params,
                name: 'John Doe',
                email: 'test@a.com',
              }).pipe(delay(100))
            );
          },
        })
      )
    );

    TestBed.configureTestingModule({
      providers: [Store],
    });
    const store = TestBed.inject(Store);

    expect(store.userQuery.status()).toBe('loading');
  });

  // todo tester avec fakeAsync et withRxQuery

  it('should have resolved status when loader completes successfully', async () => {
    const Store = signalStore(
      withQuery('user', () =>
        query({
          params: () => '5',
          loader: ({ params }) => {
            return lastValueFrom(
              of({
                id: params,
                name: 'John Doe',
                email: 'test@a.com',
              }).pipe(delay(1))
            );
          },
        })
      )
    );

    TestBed.configureTestingModule({
      providers: [Store],
    });
    const store = TestBed.inject(Store);

    //@ts-ignore
    expect(store.userQuery.value()).toEqual(undefined);

    // Wait for the query to resolve
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(store.userQuery.status()).toBe('resolved');
    expect(store.userQuery.value()).toEqual({
      id: '5',
      name: 'John Doe',
      email: 'test@a.com',
    });
  });

  it('should handle query with resource stream', async () => {
    const Store = signalStore(
      withQuery('user', () =>
        query({
          params: () => '5',
          stream: async ({ params }) => {
            type StreamResponseTypeRetrieved = Expect<
              Equal<typeof params, string>
            >;
            const testSignal = signal<
              ResourceStreamItem<{
                count: number;
              }>
            >({
              value: {
                count: 5,
              },
            });

            // Add a delay of 200ms before returning the response
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Update the value after 300ms
            setTimeout(() => {
              testSignal.set({
                value: {
                  count: 6,
                },
              });
            }, 100);

            return testSignal.asReadonly();
          },
        })
      )
    );

    TestBed.configureTestingModule({
      providers: [Store],
    });
    const store = TestBed.inject(Store);

    //@ts-ignore
    expect(store.userQuery.value()).toEqual(undefined);
    expect(store.userQuery.status()).toEqual('loading');

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(store.userQuery.status()).toEqual('resolved');
    expect(store.userQuery.value()).toEqual({
      count: 5,
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(store.userQuery.value()).toEqual({
      count: 6,
    });
  });
});

// Typing test👇

type InferSignalStoreFeatureReturnedType<
  T extends SignalStoreFeature<any, any>
> = T extends SignalStoreFeature<any, infer R> ? R : never;

it('Should be well typed', () => {
  const queryByIdTest = withQuery('user', () =>
    query({
      params: () => '5',
      loader: ({ params }) => {
        return lastValueFrom(
          of({
            id: params,
            name: 'John Doe',
            email: 'test@a.com',
          } satisfies User)
        );
      },
    })
  );
  type ResultType = InferSignalStoreFeatureReturnedType<typeof queryByIdTest>;
  type PropsKeys = keyof ResultType['props'];

  type ExpectTheResourceNameAndQueriesTypeRecord = Expect<
    Equal<PropsKeys, 'userQuery' | '__query'>
  >;

  type ExpectThePropsToHaveARecordWithResourceRef = Expect<
    Equal<ResultType['props']['userQuery'], ResourceRef<User>>
  >;

  type ExpectThePropsToHaveARecordWithQueryNameAndHisType = Expect<
    Equal<
      ResultType['props']['__query'],
      {
        user: {
          id: string;
          name: string;
          email: string;
        };
      }
    >
  >;
  // todo check if it can be merged

  const multiplesWithQuery = signalStoreFeature(
    withState({
      userSelected: {
        id: '5',
      },
      user: undefined as User | undefined,
      test: 3,
    }),
    withQuery(
      'userDetails',
      (store) =>
        query({
          params: store.userSelected,
          loader: ({ params }) => {
            type ExpectParamsToBeTyped = Expect<
              Equal<
                typeof params,
                {
                  id: string;
                }
              >
            >;
            return lastValueFrom(
              of<User>({
                id: 'params.id',
                name: 'John Doe',
                email: 'test@a.com',
              })
            );
          },
        }),
      (store) => ({
        associatedClientState: {
          path: 'user',
        },
      })
    ),
    withQuery('users', (store) =>
      query({
        params: () => '5',
        loader: ({ params }) => {
          return lastValueFrom(
            of([
              {
                id: params,
                name: 'John Doe',
                email: 'test@a.com',
              },
            ] satisfies User[])
          );
        },
      })
    )
  );

  type ResultTypeMultiplesQuery = InferSignalStoreFeatureReturnedType<
    typeof multiplesWithQuery
  >;

  type ExpectThePropsToHaveARecordWithMultipleQueryNameAndHisType = Expect<
    Equal<
      keyof ResultTypeMultiplesQuery['props']['__query'],
      'userDetails' | 'users'
    >
  >;
});

it('clientStatePath option should infer signalStore state path', () => {
  const queryByIdTest = signalStore(
    withState({
      pagination: {
        page: 1,
        pageSize: 10,
        filters: {
          search: '',
          sort: '',
          order: 'asc',
        },
      },
      selectedUserId: undefined,
      user: undefined as User | undefined,
    }),
    withQuery(
      'userQuery',
      () =>
        query({
          params: () => ({
            id: '5',
          }),
          loader: ({ params }) => {
            return lastValueFrom(
              of<Omit<User, 'id'>>({
                name: 'John Doe',
                email: 'test@a.com',
              })
            );
          },
        }),
      () => ({
        associatedClientState: {
          path: 'user',
          mapResourceToState: ({ queryParams, queryResource }) => {
            type ExpectQueryParamsToBeTyped = Expect<
              Equal<typeof queryParams, { id: string }>
            >;
            type ExpectQueryResourceToBeTyped = Expect<
              Equal<typeof queryResource, ResourceRef<Omit<User, 'id'>>>
            >;
            return {
              id: queryParams.id,
              ...queryResource.value(),
            };
          },
        },
      })
    )
  );
});
