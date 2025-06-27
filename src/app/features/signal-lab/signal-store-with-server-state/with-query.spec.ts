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

it('Third parameter should the associated client state', () => {
  type State = {
    pagination: {
      page: number;
      pageSize: number;
      filters: {
        search: string;
        sort: string;
        order: 'asc' | 'desc';
      };
    };
    users: [];

    selectedUserId: string | undefined;
    userDetails: User | undefined;
  };
  type keys = keyof State;
  //   ^?
  type StateValue = State[keys];

  type AllStatePathResult = ObjectDeepPath<State>;

  type ExpectAllStatePath =
    | {} // used to allow empty object
    | 'pagination'
    | 'pagination.page'
    | 'pagination.pageSize'
    | 'pagination.filters'
    | 'pagination.filters.search'
    | 'pagination.filters.sort'
    | 'pagination.filters.order';

  type ExpectToGetAllStateDeepPath = Expect<
    Equal<ExpectAllStatePath, AllStatePathResult>
  >;

  const test = 'somethingNotInTheState' satisfies ExpectAllStatePath;

  type ExpectToAllowEveryString = Expect<
    Equal<typeof test, 'somethingNotInTheState'>
  >;
});
