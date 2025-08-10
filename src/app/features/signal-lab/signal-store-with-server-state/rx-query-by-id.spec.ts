import {
  signal,
  Injector,
  runInInjectionContext,
  ApplicationRef,
} from '@angular/core';
import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { rxQueryById } from './rx-query-by-id';
import { InternalType } from './types/util.type';
import { Equal, Expect } from '../../../../../test-type';
import { signalStore } from '@ngrx/signals';
import { withQueryById } from './with-query-by-id';
import { User } from '../resource-by-group/api.service';

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

describe('rxQueryById used with: withQueryById', () => {
  it('1- Should expose a query with a record of resource by id', async () => {
    const returnedUser = {
      id: '5',
      name: 'John Doe',
      email: 'test@a.com',
    };
    const Store = signalStore(
      withQueryById('user', () =>
        rxQueryById({
          params: () => '5',
          stream: ({ params }) => {
            return of<User>(returnedUser);
          },
          identifier: (params) => params,
        })
      )
    );

    TestBed.configureTestingModule({
      providers: [Store, ApplicationRef],
    });
    const store = TestBed.inject(Store);

    expect(store.userQueryById).toBeDefined();

    await TestBed.inject(ApplicationRef).whenStable();
    expect(store.userQueryById()['5']?.value()).toBe(returnedUser);
  });
});
