import {
  signalStoreFeature,
  SignalStoreFeature,
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
    withMutation(
      'updateUser',
      (store) =>
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
      // queries: {
      //   user: {
      //     reload: {
      //       onMutationError: true,
      //     },

      //     optimisticPatch: {
      //       'address.street': () => 'true',
      //     },
      //   },
      //   users: {
      //     optimistic: ({ queryResource, mutationResource, mutationParams }) => {
      //       type ExpectQueryResourceType = Expect<
      //         Equal<
      //           typeof queryResource,
      //           ResourceRef<
      //             | {
      //                 id: string;
      //                 name: string;
      //                 email: string;
      //               }[]
      //             | undefined
      //           >
      //         >
      //       >;
      //       type ExpectMutationResourceType = Expect<
      //         Equal<
      //           typeof mutationResource,
      //           ResourceRef<{
      //             id: string;
      //             name: string;
      //             email: string;
      //           }>
      //         >
      //       >;

      //       type ExpectMutationParamsType = Expect<
      //         Equal<typeof mutationParams, { id: string }>
      //       >;
      //       return queryResource.value();
      //     },
      //   },
      // },
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

  type test2 = ResultTypeMutation['methods']['mutateUpdateUser'];
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

type testUserPath = ObjectDeepPath<User & {}>;

const test: {
  [key in testUserPath]?: AccessTypeObjectPropertyByDottedPath<
    User,
    DottedPathPathToTuple<key>
  >;
} = {
  'address.street': 'test',
};
