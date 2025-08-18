import { TestBed } from '@angular/core/testing';
import { signalStore, signalStoreFeature, withState } from '@ngrx/signals';
import { delay, lastValueFrom, of } from 'rxjs';
import { withQueryById } from './with-query-by-id';
import { Equal, Expect } from '../../../../../test-type';
import {
  ApplicationRef,
  Injector,
  ResourceRef,
  runInInjectionContext,
} from '@angular/core';
import { SIGNAL } from '@angular/core/primitives/signals';
import { ResourceByIdRef } from '../resource-by-id';
import { queryById } from './query-by-id';
import { withMutation } from './with-mutation';
import { vi } from 'vitest';
import { mutation } from './mutation';
import { withMutationById } from './with-mutation-by-id';
import { mutationById } from './mutation-by-id';

type User = {
  id: string;
  name: string;
  email: string;
};

describe('withMutationById', () => {
  it('1- Should expose a mutation resource with a record of resource by id', async () => {
    const returnedUser = {
      id: '5',
      name: 'John Doe',
      email: 'test@a.com',
    };
    const Store = signalStore(
      withMutationById('user', () =>
        mutationById({
          params: () => '5',
          loader: ({ params }) => {
            return lastValueFrom(of<User>(returnedUser));
          },
          identifier: (params) => params,
        })
      )
    );

    TestBed.configureTestingModule({
      providers: [Store, ApplicationRef],
    });
    const store = TestBed.inject(Store);

    expect(store.userMutationById).toBeDefined();

    await TestBed.inject(ApplicationRef).whenStable();
    expect(store.userMutationById()['5']?.value()).toBe(returnedUser);

    type ExpectUserQueryToBeAnObjectWithResourceByIdentifier = Expect<
      Equal<
        typeof store.userMutationById,
        (() => {
          [x: string]: ResourceRef<User> | undefined;
        }) & {
          [SIGNAL]: unknown;
        }
      >
    >;
  });

  it('2- Should optimistic update the query state imperatively', async () => {
    const returnedUser = {
      id: '5',
      name: 'John Doe',
      email: 'test@a.com',
    };
    const Store = signalStore(
      withState({
        usersFetched: [] as User[],
        lastUserFetched: undefined as User | undefined,
      }),
      withQueryById('user', () =>
        queryById({
          params: () => '5',
          loader: ({ params }) => {
            return lastValueFrom(of<User>(returnedUser).pipe(delay(10)));
          },
          identifier: (params) => params,
        })
      ),
      withMutationById(
        'user',
        () =>
          mutationById({
            method: (user: User) => user,
            loader: ({ params: user }) => {
              return lastValueFrom(of(user));
            },
            identifier: ({ id }) => id,
          }),
        () => ({
          queriesEffects: {
            userQueryById: {
              optimistic: ({
                mutationParams,
                queryResource,
                queryIdentifier,
                mutationResource,
                mutationResources,
              }) => {
                type ExpectIdentifierToBeString = Expect<
                  Equal<typeof queryIdentifier, string>
                >;
                return {
                  ...(queryResource.hasValue() ? queryResource.value() : {}),
                  ...mutationParams,
                };
              },
              filter: ({
                mutationParams,
                mutationResource,
                queryIdentifier,
                queryResource,
              }) => {
                type ExpectMutationResourceToBeRetrieved = Expect<
                  Equal<typeof mutationResource, ResourceRef<User>>
                >;

                type ExpectQueryResourceToBeRetrieved = Expect<
                  Equal<
                    typeof queryResource,
                    ResourceRef<{
                      id: string;
                      name: string;
                      email: string;
                    }>
                  >
                >;

                type ExpectQueryIdentifierToBeRetrieved = Expect<
                  Equal<typeof queryIdentifier, string>
                >;

                type ExpectMutationParamsToBeRetrieved = Expect<
                  Equal<typeof mutationParams, User>
                >;
                return queryIdentifier === mutationParams.id;
              },
            },
          },
        })
      )
    );

    TestBed.configureTestingModule({
      providers: [Store, ApplicationRef],
    });
    const store = TestBed.inject(Store);
    expect(store.usersFetched().length).toBe(0);

    await TestBed.inject(ApplicationRef).whenStable();
    expect(store.userQueryById()['5']?.value()).toBe(returnedUser);

    type ExpectUserQueryToBeAnObjectWithResourceByIdentifier = Expect<
      Equal<typeof store.userQueryById, ResourceByIdRef<string, NoInfer<User>>>
    >;
    store.mutateUser({
      id: '5',
      name: 'Updated User',
      email: 'updated.doe@example.com',
    });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.userQueryById()['5']?.value()).toEqual({
      id: '5',
      name: 'Updated User',
      email: 'updated.doe@example.com',
    });
  });

  it('3- Should optimistic patch the query state imperatively', async () => {
    const returnedUser = {
      id: '5',
      name: 'John Doe',
      email: 'test@a.com',
    };
    const Store = signalStore(
      withState({
        usersFetched: [] as User[],
        lastUserFetched: undefined as User | undefined,
      }),
      withQueryById('user', () =>
        queryById({
          params: () => '5',
          loader: ({ params }) => {
            return lastValueFrom(of<User>(returnedUser).pipe(delay(10)));
          },
          identifier: (params) => params,
        })
      ),
      withMutationById(
        'user',
        () =>
          mutationById({
            method: (user: User) => user,
            loader: ({ params: user }) => {
              return lastValueFrom(of(user));
            },
            identifier: ({ id }) => id,
          }),
        () => ({
          queriesEffects: {
            userQueryById: {
              optimisticPatch: {
                name: ({ mutationParams }) => mutationParams.name,
              },
              filter: ({ mutationParams, queryIdentifier }) => {
                return queryIdentifier === mutationParams.id;
              },
            },
          },
        })
      )
    );

    TestBed.configureTestingModule({
      providers: [Store, ApplicationRef],
    });
    const store = TestBed.inject(Store);
    expect(store.usersFetched().length).toBe(0);

    await TestBed.inject(ApplicationRef).whenStable();
    expect(store.userQueryById()['5']?.value()).toBe(returnedUser);

    type ExpectUserQueryToBeAnObjectWithResourceByIdentifier = Expect<
      Equal<typeof store.userQueryById, ResourceByIdRef<string, NoInfer<User>>>
    >;
    store.mutateUser({
      id: '5',
      name: 'Updated User',
      email: 'updated.doe@example.com',
    });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(store.userQueryById()['5']?.value()).toEqual({
      id: '5',
      name: 'Updated User',
      email: returnedUser.email,
    });
  });

  // it('5- Declarative: should handle query reload on mutation change', async () => {
  //   const returnedUser = {
  //     id: '5',
  //     name: 'John Doe',
  //     email: 'test@a.com',
  //   };
  //   const Store = signalStore(
  //     withState({
  //       usersFetched: [] as User[],
  //       lastUserFetched: undefined as User | undefined,
  //     }),
  //     withMutation('user', () =>
  //       mutation({
  //         method(user: User) {
  //           return user;
  //         },
  //         loader({ params }) {
  //           return lastValueFrom(of<User>(params).pipe(delay(10)));
  //         },
  //       })
  //     ),
  //     withQueryById(
  //       'user',
  //       () =>
  //         queryById({
  //           params: () => '5',
  //           loader: ({ params }) => {
  //             return lastValueFrom(of<User>(returnedUser));
  //           },
  //           identifier: (params) => params,
  //         }),
  //       (store) => ({
  //         on: {
  //           userMutation: {
  //             filter: ({ mutationParams, queryIdentifier }) =>
  //               mutationParams.id === queryIdentifier,
  //             reload: {
  //               onMutationLoading: true,
  //               onMutationResolved: true,
  //             },
  //           },
  //         },
  //       })
  //     )
  //   );

  //   TestBed.configureTestingModule({
  //     providers: [Store, ApplicationRef],
  //   });
  //   const store = TestBed.inject(Store);
  //   await TestBed.inject(ApplicationRef).whenStable();
  //   const userQuery5 = store.userQueryById()['5'];
  //   expect(userQuery5?.value()).toBe(returnedUser);
  //   const userQuery5ReloadSpy = vi.spyOn(userQuery5!, 'reload');
  //   store.mutateUser({
  //     id: '5',
  //     name: 'Updated User',
  //     email: 'updated.doe@example.com',
  //   });

  //   await wait(50);

  //   expect(userQuery5ReloadSpy.mock.calls.length).toBe(2);
  // });

  it('#1- Should expose private query type', async () => {
    const returnedUser = {
      id: '5',
      name: 'John Doe',
      email: 'test@a.com',
    };
    const StoreFeature = signalStoreFeature(
      withState({
        usersFetched: [] as User[],
        lastUserFetched: undefined as User | undefined,
      }),
      withQueryById(
        'user',
        () =>
          queryById({
            params: () => '5',
            loader: ({ params }) => {
              return lastValueFrom(of<User>(returnedUser).pipe(delay(10)));
            },
            identifier: (params) => params,
          }),
        (store) => ({
          state: {
            usersFetched: ({
              queryParams,
              queryResource,
              queryIdentifier,
              queryResources,
            }) => {
              type ExpectQueryParamsToBeTyped = Expect<
                Equal<typeof queryParams, string>
              >;
              expect(queryParams).toBe('5');

              type ExpectQueryResourceToBeTyped = Expect<
                Equal<typeof queryResource, ResourceRef<User>>
              >;
              expect(queryResource.value()).toBe(returnedUser);

              type ExpectLastResolvedResourceIdentifierToBeTyped = Expect<
                Equal<typeof queryIdentifier, string>
              >;
              expect(queryIdentifier).toBe('5');

              type ExpectLastResolvedResourceToBeTyped = Expect<
                Equal<
                  typeof queryResources,
                  ResourceByIdRef<string, NoInfer<User>>
                >
              >;
              expect(Object.entries(queryResources()).length).toEqual(1);
              expect(queryResources()['5']?.value()).toEqual(returnedUser);

              expect(store.usersFetched().length).toEqual(0);
              return [
                ...store
                  .usersFetched()
                  .filter((user) => user.id !== queryResource.value()?.id),
                queryResource.value(),
              ];
            },
          },
        })
      )
    );

    type StoreFeatureQueryType = ReturnType<
      typeof StoreFeature
    >['props']['__query']['user'];

    type ExpectStoreFeatureQueryTypeToBeFullyRetrieved = Expect<
      Equal<
        StoreFeatureQueryType,
        {
          state: User;
          params: string;
          args: unknown;
          isGroupedResource: true;
          groupIdentifier: string;
        }
      >
    >;
  });
});

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
