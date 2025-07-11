import { lastValueFrom, of } from 'rxjs';
import { Equal, Expect } from '../../../../../test-type';
import {
  signalStore,
  signalStoreFeature,
  SignalStoreFeature,
  withState,
} from '@ngrx/signals';
import { withQuery } from './with-query';
import { resource, ResourceRef } from '@angular/core';

type User = {
  id: string;
  name: string;
  email: string;
};

type InferSignalStoreFeatureReturnedType<
  T extends SignalStoreFeature<any, any>
> = T extends SignalStoreFeature<any, infer R> ? R : never;

it('Should be well typed', () => {
  const queryByIdTest = withQuery('user', () =>
    resource({
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
    Equal<PropsKeys, 'user' | '__query'>
  >;

  type ExpectThePropsToHaveARecordWithResourceRef = Expect<
    Equal<ResultType['props']['user'], ResourceRef<User | undefined>>
  >;

  type ExpectThePropsToHaveARecordWithQueryNameAndHisType = Expect<
    Equal<
      ResultType['props']['__query'],
      {
        user:
          | {
              id: string;
              name: string;
              email: string;
            }
          | undefined;
      }
    >
  >;
  // todo check if it can be merged

  const multiplesWithQuery = signalStoreFeature(
    withQuery('user', () =>
      resource({
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
    )
  );

  type ResultTypeMultiplesQuery = InferSignalStoreFeatureReturnedType<
    typeof multiplesWithQuery
  >;

  type ExpectThePropsToHaveARecordWithMultipleQueryNameAndHisType = Expect<
    Equal<keyof ResultTypeMultiplesQuery['props']['__query'], 'user' | 'users'>
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
    withQuery('userQuery', () => ({
      resource: resource({
        params: () => '5',
        loader: ({ params }) => {
          return lastValueFrom(
            of<User>({
              id: params,
              name: 'John Doe',
              email: 'test@a.com',
            })
          );
        },
      }),
      clientStatePath: 'user',
    }))
  );
});

// todo faire test avec typage en dur pour le clientStatePath
