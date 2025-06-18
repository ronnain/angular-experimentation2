import { of } from 'rxjs';
import { Equal, Expect } from '../../../../../test-type';
import {
  MergeEntitiesRecord,
  RemoveIndexSignature,
  withQuery,
} from './server-state-store';

type MergeEntitiesRecordTest = MergeEntitiesRecord<
  {
    common: {
      state: {
        id: '';
        name: '';
        email: '';
      };
      derivedState: {
        totalUsers: 0;
      };
      mutations: {
        updateUser: (user: { id: string; name: string }) => {};
      };
      entitySelectors: {
        isProcessing: true;
      };
      selectors: {
        hasProcessing: true;
      };
    };
    uncommon2: {
      state: {
        id: '';
        name: '';
        email: '';
      };
      derivedState: {
        totalUsers: 0;
      };
      mutations: {
        updateUser: (user: { id: string; name: string }) => {};
      };
      entitySelectors: {
        isProcessing: true;
      };
      selectors: {
        hasProcessing: true;
      };
    };
  },
  {
    common: {
      state: {
        email2: '';
      };
      derivedState: {
        totalUsers2: 0;
      };
      mutations: {
        updateUser2: (user: { id: string; name: string }) => {};
      };
      entitySelectors: {
        isProcessing2: true;
      };
      selectors: {
        hasProcessing2: true;
      };
    };
    uncommon3: {
      state: {
        email2: '';
      };
      derivedState: {
        totalUsers2: 0;
      };
      mutations: {
        updateUser2: (user: { id: string; name: string }) => {};
      };
      entitySelectors: {
        isProcessing2: true;
      };
      selectors: {
        hasProcessing2: true;
      };
    };
  }
>;

it('Should preserve all keys', () => {
  type test = Expect<
    Equal<keyof MergeEntitiesRecordTest, 'common' | 'uncommon2' | 'uncommon3'>
  >;
});

it('Should merge config of entities with same key', () => {
  type testState = Expect<
    Equal<
      MergeEntitiesRecordTest['common']['state'],
      { id: ''; name: ''; email: ''; email2: '' }
    >
  >;
  type testMutation = Expect<
    Equal<
      keyof MergeEntitiesRecordTest['common']['mutations'],
      'updateUser' | 'updateUser2'
    >
  >;
  type testSelectors = Expect<
    Equal<
      keyof MergeEntitiesRecordTest['common']['selectors'],
      'hasProcessing' | 'hasProcessing2'
    >
  >;
  type testEntitySelectors = Expect<
    Equal<
      keyof MergeEntitiesRecordTest['common']['entitySelectors'],
      'isProcessing' | 'isProcessing2'
    >
  >;
});

type Params = {
  id: string;
  ordering: string;
};
it('Should pass params type from params function to query parameters', () => {
  withQuery({
    on: () => of<Params>({ id: '123', ordering: 'asc' }),
    query: ({ payload }) => {
      type test = Expect<Equal<typeof payload, Params>>;
      return of({
        name: 'John Doe',
        email: 'john.doe@example.com',
      });
    },
    queryKey: 'users',
  });
});

type User = {
  id: string;
  name: string;
  email: string;
};
it('Should add the query response type to the state', () => {
  const query = withQuery({
    on: () => of<Params>({ id: '123', ordering: 'asc' }),
    query: () => {
      return of<User>({
        name: 'John Doe',
        email: 'john.doe@example.com',
        id: '1',
      });
    },
    queryKey: 'users',
  });
  type QueryStateReturnType = RemoveIndexSignature<
    ReturnType<typeof query>['state']
  >;
  type test = Expect<Equal<QueryStateReturnType, User>>;
});

it('Should request a path for entities query config', () => {
  //@ts-expect-error
  const query = withQuery({
    on: () => of<Params>({ id: '123', ordering: 'asc' }),
    query: () => {
      return of<User[]>([
        {
          name: 'John Doe',
          email: 'john.doe@example.com',
          id: '1',
        },
      ]);
    },
  });
});

it('Should return entities with the inferred state from the query', () => {
  const query = withQuery({
    on: () => of<Params>({ id: '123', ordering: 'asc' }),
    query: () => {
      return of<User[]>([
        {
          name: 'John Doe',
          email: 'john.doe@example.com',
          id: '1',
        },
      ]);
    },
    queryKey: 'users',
  });
  type QueryStateReturnType = RemoveIndexSignature<
    ReturnType<typeof query>['entities']['users']['state']
  >;
  type test = Expect<Equal<QueryStateReturnType, User>>;
});

it('Should return an empty state, if the entities queryKey is not existing', () => {
  const query = withQuery({
    on: () => of<Params>({ id: '123', ordering: 'asc' }),
    query: () => {
      return of<User[]>([
        {
          name: 'John Doe',
          email: 'john.doe@example.com',
          id: '1',
        },
      ]);
    },
    queryKey: 'users',
  });
  type QueryStateReturnType = RemoveIndexSignature<
    ReturnType<typeof query>['entities']['A']['state']
  >;
  type test = Expect<Equal<QueryStateReturnType, {}>>;
});
