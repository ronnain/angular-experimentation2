import {
  signalStoreFeature,
  SignalStoreFeature,
  StateSignals,
  withProps,
  withState,
} from '@ngrx/signals';
import { Equal, Expect } from '../../../../../test-type';
import { query, withQuery } from './with-query';
import { lastValueFrom, of } from 'rxjs';
import { ResourceRef, signal } from '@angular/core';
import { mutation, withMutation } from './with-mutation';
import { ObjectDeepPath } from './types/object-deep-path-mapper.type';
import {
  AccessTypeObjectPropertyByDottedPath,
  DottedPathPathToTuple,
} from './types/access-type-object-property-by-dotted-path.type';
import { Prettify } from '../../../util/types/prettify';

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
            } satisfies User)
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
            user: {
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
    withMutation('updateUser', () =>
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
      MutationProps['updateUser'],
      ResourceRef<{
        id: string;
        name: string;
        email: string;
      }>
    >
  >;

  type ExpectPropsToHaveARecordWithMutationNameWithMutationState = Expect<
    Equal<
      MutationProps['__mutation']['updateUser'],
      {
        id: string;
        name: string;
        email: string;
      }
    >
  >;

  type ExpectToHaveAnExposedMethod = Expect<
    Equal<keyof ResultTypeMutation['methods'], 'mutateUpdateUser'>
  >;

  type ExpectToHaveAnExposedMethodWithTypedParams = Expect<
    Equal<
      Parameters<ResultTypeMutation['methods']['mutateUpdateUser']>[0],
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
      MutationStoreOutputType['props']['updateUser'],
      ResourceRef<{
        id: string;
        name: string;
        email: string;
      }>
    >
  >;

  type t = MutationStoreOutputType['methods']['mutateTestExposeMutationMethod'];
  type ExpectMutationStoreOutputTypeToHaveMutationMethod = Expect<
    Equal<
      MutationStoreOutputType['methods']['mutateTestExposeMutationMethod'],
      (params: { id: string }) => {
        id: string;
      }
    >
  >;
});
