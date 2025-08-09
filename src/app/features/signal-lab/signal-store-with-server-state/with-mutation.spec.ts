import {
  patchState,
  signalStore,
  signalStoreFeature,
  SignalStoreFeature,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { Equal, Expect } from '../../../../../test-type';
import { query, withQuery } from './with-query';
import { delay, lastValueFrom, of, tap } from 'rxjs';
import { ApplicationRef, ResourceRef, signal } from '@angular/core';
import { mutation, withMutation } from './with-mutation';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { queryById, withQueryById } from './with-query-by-id';

type User = {
  id: string;
  name: string;
  email: string;
  address?: {
    street: string;
  };
};

type InferSignalStoreFeatureReturnedType<
  T extends SignalStoreFeature<any, any>
> = T extends SignalStoreFeature<any, infer R> ? R : never;

describe('withMutation', () => {
  it('#1 The signalStore should expose a mutation resource and mutation method', () => {
    const MutationStore = signalStore(
      withMutation('updateUser', () =>
        mutation({
          method: (id: string) => ({ id }),
          loader: ({ params }) => {
            return lastValueFrom(
              of({
                id: params.id,
                name: 'Updated User',
                email: 'er@d',
              } satisfies User)
            );
          },
        })
      )
    );
    TestBed.configureTestingModule({
      providers: [MutationStore],
    });
    const store = TestBed.inject(MutationStore);
    expect(store.updateUserMutation).toBeDefined();
    console.log(
      'store.updateUser.hasValue()',
      store.updateUserMutation.hasValue()
    );
    expect(store.updateUserMutation.hasValue()).toBe(false);
    expect(store.mutateUpdateUser).toBeDefined();
  });

  it('#2 When the mutation loader is triggered it should update optimistically the associated query value', fakeAsync(() => {
    const MutationStore = signalStore(
      withState({
        userSelected: undefined as { id: string } | undefined,
      }),
      withQuery('user', (store) =>
        query({
          params: store.userSelected,
          loader: ({ params }) => {
            return lastValueFrom(
              of({
                id: params?.id,
                name: 'John Doe',
                email: 'john.doe@example.com',
              } satisfies User).pipe(delay(2000))
            );
          },
        })
      ),
      withMutation(
        'user',
        () =>
          mutation({
            method: (user: User) => user,
            loader: ({ params: user }) => {
              return lastValueFrom(of(user satisfies User));
            },
          }),
        () => ({
          queriesEffects: {
            userQuery: {
              optimistic: ({ mutationParams, queryResource }) => ({
                ...(queryResource.hasValue() ? queryResource.value() : {}),
                ...mutationParams,
              }),
            },
          },
        })
      )
    );
    TestBed.configureTestingModule({
      providers: [MutationStore],
    });
    const store = TestBed.inject(MutationStore);
    expect(store.userQuery.hasValue()).toBe(false);
    store.mutateUser({
      id: '1',
      name: 'Updated User',
      email: 'updated@example.com',
    });
    tick();
    expect(store.userQuery.hasValue()).toBe(true);
    console.log('store.user.value()', store.userQuery.value());
    expect(store.userQuery.value()).toEqual({
      id: '1',
      name: 'Updated User',
      email: 'updated@example.com',
    });
  }));
  it('#3 When the mutation loader is triggered it should reload the associated query when the mutation is resolved', async () => {
    const MutationStore = signalStore(
      withState({
        userSelected: { id: 'init' } as { id: string } | undefined,
      }),
      withQuery('user', (store) =>
        query({
          params: store.userSelected,
          loader: ({ params }) => {
            return lastValueFrom(
              of({
                id: params?.id,
                name: 'John Doe',
                email: 'john.doe@example.com',
              } satisfies User).pipe(delay(1000))
            );
          },
        })
      ),
      withMutation(
        'updateUser',
        () =>
          mutation({
            method: (user: User) => user,
            loader: ({ params: user }) => {
              return lastValueFrom(
                of(user satisfies User).pipe(
                  delay(10),
                  tap((data) => console.log('mutation resolved', data))
                )
              );
            },
          }),
        () => ({
          queriesEffects: {
            userQuery: {
              reload: {
                onMutationResolved: true,
              },
            },
          },
        })
      )
    );
    TestBed.configureTestingModule({
      providers: [MutationStore],
    });
    const store = TestBed.inject(MutationStore);
    await new Promise((resolve) => setTimeout(resolve, 1020));
    console.log('resolve: store.user.status()', store.userQuery.status());

    expect(store.userQuery.status()).toEqual('resolved');

    store.mutateUpdateUser({
      id: '1',
      name: 'Updated User',
      email: 'updated@example.com',
    });

    // Wait for the query to resolve
    await new Promise((resolve) => setTimeout(resolve, 3));

    expect(store.updateUserMutation.status()).toEqual('loading');

    await new Promise((resolve) => setTimeout(resolve, 15));

    expect(store.updateUserMutation.status()).toEqual('resolved');

    expect(store.userQuery.status()).toEqual('reloading');

    await new Promise((resolve) => setTimeout(resolve, 1050));
    expect(store.userQuery.status()).toEqual('resolved');
  });

  it('#4 Should invalidate queryById', async () => {
    const MutationStore = signalStore(
      withState({
        userSelected: undefined as { id: string } | undefined,
      }),
      withMethods((store) => ({
        selectUser: (id: string) => {
          patchState(store, {
            userSelected: { id },
          });
        },
      })),
      withQueryById('user', (store) =>
        queryById({
          params: store.userSelected,
          loader: ({ params }) => {
            // todo wait with promise
            return lastValueFrom(
              of({
                id: params?.id,
                name: 'John Doe',
                email: 'john.doe@example.com',
              } satisfies User).pipe(delay(2000))
            );
          },
          identifier: (params) => params.id,
        })
      ),
      withMutation(
        'user',
        (store) =>
          mutation({
            method: (user: User) => user,
            loader: ({ params: user }) => {
              return lastValueFrom(of(user satisfies User));
            },
          }),
        () => ({
          queriesEffects: {
            userQueryById: {
              optimistic: ({
                mutationParams,
                queryResource,
                queryIdentifier,
              }) => {
                type ExpectIdentifierToBeString = Expect<
                  Equal<typeof queryIdentifier, string>
                >;
                console.log('queryResource optimistic', queryResource);
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
      providers: [MutationStore, ApplicationRef],
    });
    const store = TestBed.inject(MutationStore);
    store.selectUser('1');
    await TestBed.inject(ApplicationRef).whenStable();
    const user1Query = store.userQueryById()['1'];
    expect(user1Query?.status()).toBe('resolved');
    expect(user1Query?.value()).toEqual({
      id: '1',
      name: 'John Doe',
      email: 'john.doe@example.com',
    });
    store.mutateUser({
      id: '1',
      name: 'Updated User',
      email: 'updated.user@example.com',
    });
    await TestBed.inject(ApplicationRef).whenStable();
    expect(user1Query?.status()).toBe('local');
    expect(user1Query?.value()).toEqual({
      id: '1',
      name: 'Updated User',
      email: 'updated.user@example.com',
    });
  });
});

// Types testing 👇

it('Should be well typed', () => {
  const multiplesWithQueryAndMutation = signalStoreFeature(
    withState({
      userSelected: undefined as { id: string } | undefined,
    }),
    withQuery('user', () =>
      query({
        params: () => '5',
        loader: ({ params }) => {
          return lastValueFrom(
            of({
              id: params,
              name: 'John Doe',
              email: 'test@a.com',
            } satisfies User as User)
          );
        },
      })
    ),
    withQuery('users', () =>
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
    ),
    withMutation('updateUserAddress', (store) =>
      mutation({
        params: store.userSelected,
        loader: ({ params }) => {
          return lastValueFrom(
            of({
              id: params.id,
              name: 'Updated User',
              email: 'er@d',
            } satisfies User).pipe(delay(2000))
          );
        },
      })
    ),
    withMutation(
      'updateName',
      (store) =>
        mutation({
          params: store.userSelected,
          loader: ({ params }) => {
            return lastValueFrom(
              of({
                id: params.id,
                name: 'Updated Name',
                email: 'er@d',
              } satisfies User)
            );
          },
        }),
      (store) => {
        type ExpectStoreTypeToBeRetrieved = Expect<
          Equal<
            ReturnType<(typeof store)['userSelected']>,
            | {
                id: string;
              }
            | undefined
          >
        >;
        return {
          queriesEffects: {
            userQuery: {
              optimisticPatch: {
                name: ({ mutationResource, queryResource, targetedState }) => {
                  type ExpectMutationResourceToBeRetrieved = Expect<
                    Equal<
                      typeof mutationResource,
                      ResourceRef<
                        NoInfer<{
                          id: string;
                          name: string;
                          email: string;
                        }>
                      >
                    >
                  >;

                  type ExpectQueryResourceToBeRetrieved = Expect<
                    Equal<typeof queryResource, ResourceRef<NoInfer<User>>>
                  >;

                  type ExpectTargetedStateToBeRetrieved = Expect<
                    Equal<typeof targetedState, string | undefined>
                  >;
                  return (
                    targetedState ?? store.userSelected()?.id + ': Romain '
                  );
                },
              },
              optimistic: ({
                mutationParams,
                mutationResource,
                queryResource,
              }) => {
                type ExpectMutationParamsToBeRetrieved = Expect<
                  Equal<typeof mutationParams, { id: string }>
                >;

                type ExpectMutationResourceToBeRetrieved = Expect<
                  Equal<
                    typeof mutationResource,
                    ResourceRef<
                      NoInfer<{ id: string; name: string; email: string }>
                    >
                  >
                >;

                type ExpectQueryResourceToBeRetrieved = Expect<
                  Equal<typeof queryResource, ResourceRef<User>>
                >;

                return {
                  id: mutationResource.value()?.id,
                  email: mutationResource.value()?.email,
                  name: mutationResource.value()?.name,
                };
              },
            },
          },
        };
      }
    )
  );

  type ResultTypeMultiplesQuery = InferSignalStoreFeatureReturnedType<
    typeof multiplesWithQueryAndMutation
  >;

  type ExpectThePropsToHaveARecordWithMultipleQueryNameAndHisType = Expect<
    Equal<keyof ResultTypeMultiplesQuery['props']['__query'], 'user' | 'users'>
  >;
});

it('Should expose a method', () => {
  const mutationOutput = signalStoreFeature(
    withMutation('user', () =>
      mutation({
        method: (data: { page: string }) => data.page,
        loader: ({ params }) => {
          return lastValueFrom(
            of({
              id: params,
              name: 'Updated User',
              email: 'er@d',
            } satisfies User)
          );
        },
      })
    )
  );

  type ResultTypeMutation = InferSignalStoreFeatureReturnedType<
    typeof mutationOutput
  >;
  type MutationProps = ResultTypeMutation['props'];

  type ExpectPropsToHaveMutationNameWithResourceRef = Expect<
    Equal<
      MutationProps['userMutation'],
      ResourceRef<{
        id: string;
        name: string;
        email: string;
      }>
    >
  >;

  type ExpectPropsToHaveARecordWithMutationNameWithMutationState = Expect<
    Equal<
      // paramsSource is tested in another test (I did not find the way to satisfy it here)
      Omit<MutationProps['__mutation']['userMutation'], 'paramsSource'>,
      {
        state: {
          id: string;
          name: string;
          email: string;
        };
        params: string;
        args: {
          page: string;
        };
        isGroupedResource: false;
        groupIdentifier: unknown;
      }
    >
  >;

  type ExpectToHaveAnExposedMethod = Expect<
    Equal<keyof ResultTypeMutation['methods'], 'mutateUser'>
  >;

  type ExpectToHaveAnExposedMethodWithTypedParams = Expect<
    Equal<
      Parameters<ResultTypeMutation['methods']['mutateUser']>[0],
      {
        page: string;
      }
    >
  >;
});

it('Should accept the store without loosing typing', () => {
  const mutationOutput = signalStoreFeature(
    withProps(() => ({
      sourceId: signal({
        id: '4',
      }),
    })),
    withMutation('updateUser', (store) =>
      mutation({
        params: store.sourceId,
        loader: ({ params }) => {
          type ExpectParamsToBeAnObjectWithStringId = Expect<
            Equal<typeof params, { id: string }>
          >;
          return lastValueFrom(
            of({
              id: params.id,
              name: 'Updated User',
              email: 'er@d',
            } satisfies User)
          );
        },
      })
    )
  );
});

it('Should expose the mutation resource and mutation method', () => {
  const mutationOutput = signalStoreFeature(
    withProps(() => ({
      sourceId: signal({
        id: '4',
      }),
    })),
    withMutation('user', (store) =>
      mutation({
        params: store.sourceId,
        loader: ({ params }) => {
          type ExpectParamsToBeAnObjectWithStringId = Expect<
            Equal<typeof params, { id: string }>
          >;
          return lastValueFrom(
            of({
              id: params.id,
              name: 'Updated User',
              email: 'er@d',
            } satisfies User)
          );
        },
      })
    ),
    withMutation('testExposeMutationMethod', (store) =>
      mutation({
        method: ({ id }: { id: string }) => ({
          id,
        }),
        loader: ({ params }) => {
          type ExpectParamsToBeAnObjectWithStringId = Expect<
            Equal<typeof params, { id: string }>
          >;
          return lastValueFrom(
            of({
              id: params.id,
              name: 'Updated User',
              email: 'er@d',
            } satisfies User)
          );
        },
      })
    )
  );

  type MutationStoreOutputType = ReturnType<typeof mutationOutput>;

  type ExpectMutationStoreOutputTypeToHaveMutationResource = Expect<
    Equal<
      MutationStoreOutputType['props']['userMutation'],
      ResourceRef<{
        id: string;
        name: string;
        email: string;
      }>
    >
  >;
  type ExpectMutationStoreOutputTypeToHaveMutationMethod = Expect<
    Equal<
      MutationStoreOutputType['methods']['mutateTestExposeMutationMethod'],
      (params: { id: string }) => {
        id: string;
      }
    >
  >;
});

it('it should expose the mutation params source, that will be reused by query', async () => {
  const mutationParamsSourceInternallyExposed = signalStoreFeature(
    withMutation('updateUser', () =>
      mutation({
        method: (user: User) => user,
        loader: ({ params: user }) => {
          return lastValueFrom(
            of(user satisfies User).pipe(
              delay(10),
              tap((data) => console.log('mutation resolved', data))
            )
          );
        },
      })
    )
  );

  type ReturnInternalStoreType = ReturnType<
    ReturnType<
      typeof mutationParamsSourceInternallyExposed
    >['props']['__mutation']['updateUserMutation']['paramsSource']
  >;
  type ExpectMutationParamsSourceToBeDefined = Expect<
    Equal<ReturnInternalStoreType, User>
  >;
});
