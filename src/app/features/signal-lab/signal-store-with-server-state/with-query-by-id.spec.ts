import { lastValueFrom, of } from 'rxjs';
import { resourceById } from '../resource-by-id';
import { ResourceData } from './signal-store-with-server-state';
import { Equal, Expect } from '../../../../../test-type';
import {
  SignalStoreFeature,
  SignalStoreFeatureResult,
  withState,
} from '@ngrx/signals';
import { withQueryById } from './with-query-by-id';

type User = {
  id: string;
  name: string;
  email: string;
};

type InferSignalStoreFeatureReturnedType<
  T extends SignalStoreFeature<any, any>
> = T extends SignalStoreFeature<any, infer R> ? R : never;

it('Should request a path for entities query config', () => {
  const queryByIdTest = withQueryById('usersById', () =>
    resourceById({
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
      identifier: (params) => params,
    })
  );
  type ResultType = InferSignalStoreFeatureReturnedType<typeof queryByIdTest>;
  type StateKeys = keyof ResultType['state'];

  type ExpectResourceNameToBeAtTheRootState = Expect<
    Equal<StateKeys, 'usersById'>
  >;

  type ExpectTheStateToHaveARecordWithResourceData = Expect<
    Equal<
      ResultType['state']['usersById'],
      Record<string, ResourceData<User> | undefined>
    >
  >;

  type PropsPropertyKey = keyof ResultType['props'];

  type PrivatePropsPrefix = `_`;

  type ExpectPropsEffectToBePrivate = Expect<
    Equal<PropsPropertyKey, `${PrivatePropsPrefix}usersByIdEffect`>
  >;
});
