import { lastValueFrom, of } from 'rxjs';
import { ResourceData } from './signal-store-with-server-state';
import { Equal, Expect } from '../../../../../test-type';
import { signalStore, SignalStoreFeature, withState } from '@ngrx/signals';
import { withQuery } from './with-query';
import { resource, ResourceRef } from '@angular/core';
import { ObjectDeepPath } from './object-deep-path-mapper.type';

type User = {
  id: string;
  name: string;
  email: string;
};

type InferSignalStoreFeatureReturnedType<
  T extends SignalStoreFeature<any, any>
> = T extends SignalStoreFeature<any, infer R> ? R : never;

it('Should be well typed', () => {
  const queryByIdTest = withQuery(() => ({
    resourceName: 'user',
    resource: resource({
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
    }),
  }));
  type ResultType = InferSignalStoreFeatureReturnedType<typeof queryByIdTest>;
  type PropsKeys = keyof ResultType['props'];

  type ExpectResourceNameToBeAtTheRootState = Expect<Equal<PropsKeys, 'user'>>;

  type ExpectThePropsToHaveARecordWithResourceRef = Expect<
    Equal<ResultType['props']['user'], ResourceRef<User | undefined>>
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
    withQuery((store) => ({
      resourceName: 'userQuery',
      resource: resource({
        params: () => '5',
        loader: ({ params }) => {
          return lastValueFrom(
            of<User[]>([
              {
                id: params,
                name: 'John Doe',
                email: 'test@a.com',
              },
            ])
          );
        },
      }),
      clientStatePath: 'user',
      test: true,
      params: 'extendsTarget',
      mapResourceToState: ({ resource }) => {
        return '';
      },
    }))
    // withQuery('userQuery', () =>
    //   resource({
    //     params: () => '5',
    //     loader: ({ params }) => {
    //       return lastValueFrom(
    //         of<User>({
    //           id: params,
    //           name: 'John Doe',
    //           email: 'test@a.com',
    //         })
    //       );
    //     },
    //   })
    // )
  );
});

// todo faire test avec typage en dur pour le clientStatePath
