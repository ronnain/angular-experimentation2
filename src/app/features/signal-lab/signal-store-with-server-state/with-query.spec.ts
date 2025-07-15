import { lastValueFrom, of } from 'rxjs';
import { Equal, Expect } from '../../../../../test-type';
import {
  Prettify,
  signalStore,
  signalStoreFeature,
  SignalStoreFeature,
  SignalStoreFeatureResult,
  StateSignals,
  withProps,
  withState,
  WritableStateSource,
} from '@ngrx/signals';
import {
  clientState,
  pipeQuery,
  query,
  queryTest,
  testInfer,
  withQuery,
} from './with-query';
import { resource, ResourceRef } from '@angular/core';
import { ResourceWithParamsOrParamsFn } from './types/resource-with-params-or-params-fn.type';

type User = {
  id: string;
  name: string;
  email: string;
};

type InferSignalStoreFeatureReturnedType<
  T extends SignalStoreFeature<any, any>
> = T extends SignalStoreFeature<any, infer R> ? R : never;

it('Should be well typed', () => {
  const queryByIdTest = withQuery('user', {
    queryConfig: {
      params: () => () => '5',
      loader: ({ params }) => {
        return lastValueFrom(
          of({
            id: params,
            name: 'John Doe',
            email: 'test@a.com',
          } satisfies User)
        );
      },
    },
  });
  type ResultType = InferSignalStoreFeatureReturnedType<typeof queryByIdTest>;
  type PropsKeys = keyof ResultType['props'];

  type ExpectTheResourceNameAndQueriesTypeRecord = Expect<
    Equal<PropsKeys, 'user' | '__query'>
  >;

  type ExpectThePropsToHaveARecordWithResourceRef = Expect<
    Equal<ResultType['props']['user'], ResourceRef<User>>
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

  const q = query(
    {
      // params: store.userSelected,
      params: () => ({ id: '5' }),
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
          of({
            id: 'params.id',
            name: 'John Doe',
            email: 'test@a.com',
          } satisfies User)
        );
      },
    },
    (config) => {
      const result = clientState(
        { state: {}, props: {}, methods: {} },
        config,
        {
          //@ts-ignore
          path: 'user',
        }
      );
      return result;
    }
  );

  const multiplesWithQuery = signalStoreFeature(
    withState({
      userSelected: {
        id: '5',
      },
      user: undefined as User | undefined,
      test: 3,
    }),
    withQuery('user', (store, context) =>
      query(
        {
          params: store.userSelected,
          // params: () => ({ id: '5' }),
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
              of({
                id: 'params.id',
                name: 'John Doe',
                email: 'test@a.com',
              } satisfies User)
            );
          },
        },
        (config) => {
          const result = clientState(context, config, {
            path: 'user',
          });
          return result;
        }
      )
    ),
    withProps((store) => store.__query.user),
    withQuery('users', {
      queryConfig: query({
        params: (store) => () => '5',
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
      }),
    })
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
    withQuery('userQuery', {
      queryConfig: {
        params: () => () => '5',
        loader: ({ params }) => {
          return lastValueFrom(
            of<User>({
              id: params,
              name: 'John Doe',
              email: 'test@a.com',
            })
          );
        },
      },
      clientState: {
        clientStatePath: 'user',
        test: 3,
        testTarget: 'e',
        equal: true,
      },
    })
  );
});

// todo faire test avec typage en dur pour le clientStatePath

// {
//   params: store.userSelected,
//   loader: ({ params }) => {
//     type ExpectParamsToBeTyped = Expect<
//       Equal<
//         typeof params,
//         {
//           id: string;
//         }
//       >
//     >;
//     return lastValueFrom(
//       of({
//         id: 'params.id',
//         name: 'John Doe',
//         email: 'test@a.com',
//       } satisfies User)
//     );
//   },
// }
