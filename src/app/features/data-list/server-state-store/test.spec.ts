import { Equal, Expect } from '../../../../../test-type';
import { MergeEntitiesRecord } from './server-state-store';

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
