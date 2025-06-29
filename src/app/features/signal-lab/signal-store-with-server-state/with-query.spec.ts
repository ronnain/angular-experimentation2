import { lastValueFrom, of } from 'rxjs';
import { ResourceData } from './signal-store-with-server-state';
import { Equal, Expect } from '../../../../../test-type';
import { signalStore, SignalStoreFeature, withState } from '@ngrx/signals';
import { withQuery } from './with-query';
import { resource } from '@angular/core';
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
  type StateKeys = keyof ResultType['state'];

  type ExpectResourceNameToBeAtTheRootState = Expect<Equal<StateKeys, 'user'>>;

  type ExpectTheStateToHaveARecordWithResourceData = Expect<
    Equal<ResultType['state']['user'], ResourceData<User | undefined>>
  >;

  type PropsPropertyKey = keyof ResultType['props'];

  type PrivatePropsPrefix = `_`;

  type ExpectPropsEffectToBePrivate = Expect<
    Equal<PropsPropertyKey, `${PrivatePropsPrefix}userEffect`>
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
    }),
    withQuery(
      'user',
      () =>
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
        }),
      {
        clientStatePath: 'pagination.filters',
        // tuple: ['pagination', 'filters'],
        // associatedStateType: ,
        mapResourceToState: ({ store, resource }) => ({
          search: '',
          sort: '',
          order: 'asc',
        }),
        testState,
      }
    )
  );
  type ResultType = InferSignalStoreFeatureReturnedType<typeof queryByIdTest>;
  type StateKeys = keyof ResultType['state'];

  type ExpectResourceNameToBeAtTheRootState = Expect<Equal<StateKeys, 'user'>>;

  type ExpectTheStateToHaveARecordWithResourceData = Expect<
    Equal<ResultType['state']['user'], ResourceData<User | undefined>>
  >;

  type PropsPropertyKey = keyof ResultType['props'];

  type PrivatePropsPrefix = `_`;

  type ExpectPropsEffectToBePrivate = Expect<
    Equal<PropsPropertyKey, `${PrivatePropsPrefix}userEffect`>
  >;
});

// todo faire test avec typage en dur pour le clientStatePath
