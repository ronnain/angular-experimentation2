import { Equal, Expect } from '../../../../../test-type';
import { ObjectDeepPath } from './object-deep-path-mapper.type';

type User = {
  id: string;
  name: string;
  email: string;
};

it('Should map all deep object paths except arrays', () => {
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
