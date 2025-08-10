import {
  signal,
  Injector,
  runInInjectionContext,
  ApplicationRef,
} from '@angular/core';
import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { rxQueryById } from './rx-query-by-id';
import { expectTypeOf } from 'vitest';
import { InternalType } from './types/util.type';
import { Equal, Expect } from '../../../../../test-type';

describe('rxResourceById', () => {
  it('should create a rxResource by id', async (done) => {
    TestBed.configureTestingModule({
      providers: [Injector, ApplicationRef],
    });
    const injector = TestBed.inject(Injector);

    await runInInjectionContext(injector, async () => {
      const sourceParams = signal<{ id: string } | undefined>(undefined);
      const queryConfig = rxQueryById({
        identifier: (request) => request.id,
        params: sourceParams,
        stream: ({ params }) => {
          // Simulate a stream
          return of(params);
        },
      })({} as any, {} as any);
      expect(queryConfig).toBeDefined();
      expect(queryConfig.queryByIdRef.resourceById()).toEqual({});
      expect(queryConfig.queryByIdRef.resourceParamsSrc).toBeDefined();

      type ExpectTypeTObeGroupedQuery = Expect<
        Equal<
          typeof queryConfig.__types,
          InternalType<
            | {
                id: string;
              }
            | undefined,
            | {
                id: string;
              }
            | undefined,
            unknown,
            false,
            string
          >
        >
      >;
    });
  });
});
