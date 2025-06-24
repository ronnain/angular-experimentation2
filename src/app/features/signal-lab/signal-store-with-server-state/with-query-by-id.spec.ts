import { lastValueFrom, of } from 'rxjs';
import { resourceById } from '../resource-by-id';
import { withQueryById } from './signal-store-with-server-state';
import { Equal, Expect } from '../../../../../test-type';
import { withState } from '@ngrx/signals';

type User = {
  id: string;
  name: string;
  email: string;
};

it('Should request a path for entities query config', () => {
  const withStateFn = withState({
    usersById: {
      id: '5',
      name: 'John Doe',
      email: 'r',
    },
  });
  type QueryStateReturnType1 = ReturnType<
    typeof withStateFn
  >['stateSignals']['usersById'];
  const queryByIdTest = withQueryById(() => ({
    resourceName: 'usersById',
    resource: resourceById({
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
    }),
  }));
});
