import { Equal, Expect } from '../../../../../test-type';
import {
  AccessTypeObjectPropertyByDottedPath,
  DottedPathPathToTuple,
} from './access-type-object-property-by-dotted-path.type';

it('Should make a tuple from dotted path', () => {
  type DottedPath = 'pagination.filters.search';
  type TupleFromDottedPath = DottedPathPathToTuple<DottedPath>;
  const t: TupleFromDottedPath = ['pagination', 'filters', 'search'];

  type ExpectToGetTupleFromDottedPath = Expect<
    Equal<TupleFromDottedPath, ['pagination', 'filters', 'search']>
  >;
});

it('Should access to the object type by dottedPath', () => {
  type State = {
    pagination: {
      filters: {
        advancedFilters?: {
          group1?: {
            search: string;
            sort?: string;
            order: 'asc' | 'desc';
          };
          group2: {
            userName?: string;
            sort?: string;
            order?: 'asc' | 'desc';
          };
        };
      };
    };
  };

  type AccessedProperty = AccessTypeObjectPropertyByDottedPath<
    State,
    DottedPathPathToTuple<'pagination.filters.advancedFilters.group1'>
  >;

  type ExpectToAccessThePropertyByDottedPath = Expect<
    Equal<
      AccessedProperty,
      {
        search: string;
        sort?: string;
        order: 'asc' | 'desc';
      }
    >
  >;
});
