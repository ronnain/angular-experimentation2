import {
  signalStoreFeature,
  SignalStoreFeature,
  withProps,
} from '@ngrx/signals';
import { Equal, Expect } from '../../../../../test-type';
import { withQuery } from './with-query';
import { delay, lastValueFrom, of } from 'rxjs';
import { resource, ResourceRef, signal } from '@angular/core';
import { mutation, tsTypeHelper, withMutation } from './with-mutation';
import { id } from 'fp-ts/lib/Refinement';
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
    withQuery('user', () =>
      resource({
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
      resource({
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
    withMutation('updateUser', {
      mutation: mutation({
        params: () => () => ({
          id: '3',
        }),
        loader: ({ params }) => {
          return lastValueFrom(
            of({
              id: params.id,
              name: 'Updated User',
              email: 'er@d',
            } satisfies User)
          );
        },
      }),
      queries: {
        // user: {
        //   reload: {
        //     onMutationError: true,
        //   },

        //   optimisticPatch: {
        //     'address.street': () => 'true',
        //   },
        // },
        users: {
          // test1: {
          //   id: 'params',
          //   name: 'Updated User',
          //   email: 'er@d',
          // },
          // test: (data) => {
          //   return !!data;
          // },
          // test2: (data) => true,
          optimistic: ({ queryResource, mutationResource, mutationParams }) => {
            type ExpectQueryResourceType = Expect<
              Equal<
                typeof queryResource,
                ResourceRef<
                  | {
                      id: string;
                      name: string;
                      email: string;
                    }[]
                  | undefined
                >
              >
            >;
            type ExpectMutationResourceType = Expect<
              Equal<
                typeof mutationResource,
                ResourceRef<{
                  id: string;
                  name: string;
                  email: string;
                }>
              >
            >;

            type ExpectMutationParamsType = Expect<
              Equal<typeof mutationParams, { id: string }>
            >;
            return queryResource.value();
          },
        },
      },
    })
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
    withMutation('updateUser', {
      mutation: {
        method: () => (data: { page: string }) => data.page,
        loader: ({ params }) => {
          return lastValueFrom(
            of({
              id: params,
              name: 'Updated User',
              email: 'er@d',
            } satisfies User)
          );
        },
      },
      tsTypeHelper: tsTypeHelper(),
    })
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
    Equal<keyof ResultTypeMutation['methods'], 'triggerUpdateUser'>
  >;

  type test2 = ResultTypeMutation['methods']['triggerUpdateUser'];
  type ExpectToHaveAnExposedMethodWithTypedParams = Expect<
    Equal<
      Parameters<ResultTypeMutation['methods']['triggerUpdateUser']>[0],
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
    withMutation('updateUser', {
      mutation: {
        params: (store) => store.sourceId,
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
      },
      tsTypeHelper: tsTypeHelper(),
    })
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
