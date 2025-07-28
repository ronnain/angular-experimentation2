import { Equal, Expect } from '../../../../../../test-type';
import { FlattenedStateDeepPathMappedToBooleanOrMapperFn } from './flattened-state-deep-path-mapped-to-boolean-or-mapper-fn.type';

it('Should map all deep object paths except arrays', () => {
  type State = {
    pagination?: {
      page: number;
      pageSize: number;
      filters?: {
        search?: string;
        sort: string;
        order: 'asc' | 'desc';
      };
    };
  };

  type ResourceState = {
    search?: string;
    sort: string;
    order: 'asc' | 'desc';
  };

  type Params = {
    search?: string;
  };

  type AllStatePathResult = FlattenedStateDeepPathMappedToBooleanOrMapperFn<
    State,
    ResourceState,
    Params
  >;

  type Target = {
    pagination: (data: ResourceState) => {
      page: number;
      pageSize: number;
      filters?: {
        search?: string;
        sort: string;
        order: 'asc' | 'desc';
      };
    };
    'pagination.page': (data: ResourceState) => number;
    'pagination.pageSize': (data: ResourceState) => number;
    'pagination.filters':
      | boolean
      | ((data: ResourceState) => {
          search?: string;
          sort: string;
          order: 'asc' | 'desc';
        });
    'pagination.filters.search': (data: ResourceState) => string;
    'pagination.filters.sort': (data: ResourceState) => string;
    'pagination.filters.order': (data: ResourceState) => 'asc' | 'desc';
  };
  type ExpectARecordOfPathWithAssociatedType = Expect<
    Equal<Target, AllStatePathResult>
  >;

  const filtersCanBeBoolean: AllStatePathResult['pagination.filters'] = true;

  //@ts-expect-error
  const paginationCanNotBeBoolean: AllStatePathResult['pagination.page'] = true;
});
