import { Equal, Expect } from '../../../../../../test-type';
import { RecordObjectDeepPathWithType } from './record-object-deep-path-with-type-mapper.type';

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

  type WorkingState = {
    test: string;
  };

  type AllStatePathResult = RecordObjectDeepPathWithType<State, WorkingState>;

  type target = {
    pagination: (data: WorkingState) => {
      page: number;
      pageSize: number;
      filters?: {
        search?: string;
        sort: string;
        order: 'asc' | 'desc';
      };
    };
    'pagination.page': (data: WorkingState) => number;
    'pagination.pageSize': (data: WorkingState) => number;
    'pagination.filters': (data: WorkingState) => {
      search?: string;
      sort: string;
      order: 'asc' | 'desc';
    };
    'pagination.filters.search': (data: WorkingState) => string;
    'pagination.filters.sort': (data: WorkingState) => string;
    'pagination.filters.order': (data: WorkingState) => 'asc' | 'desc';
  };
  type ExpectARecordOfPathWithAssociatedType = Expect<
    Equal<target, AllStatePathResult>
  >;

  type AccessToType = AllStatePathResult['pagination.filters'];
});
