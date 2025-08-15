import {
  signal,
  Injector,
  runInInjectionContext,
  ApplicationRef,
} from '@angular/core';
import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { rxMutationById } from './rx-mutation-by-id';
import { InternalType } from './types/util.type';
import { Equal, Expect } from '../../../../../test-type';
import { signalStore } from '@ngrx/signals';
import { withMutationById } from './with-mutation-by-id';
import { User } from '../resource-by-group/api.service';

describe('rxResourceById', () => {
  it('should create a rxResource by id', async (done) => {
    TestBed.configureTestingModule({
      providers: [Injector, ApplicationRef],
    });
    const injector = TestBed.inject(Injector);

    await runInInjectionContext(injector, async () => {
      const sourceParams = signal<{ id: string } | undefined>(undefined);
      const mutationConfig = rxMutationById({
        identifier: (request) => request.id,
        params: sourceParams,
        stream: ({ params }) => {
          // Simulate a stream
          return of(params);
        },
      })({} as any, {} as any);
      expect(mutationConfig).toBeDefined();
      expect(mutationConfig.mutationByIdRef.resourceById()).toEqual({});
      expect(mutationConfig.mutationByIdRef.resourceParamsSrc).toBeDefined();

      type ExpectTypeTObeGroupedMutation = Expect<
        Equal<
          typeof mutationConfig.__types,
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

// describe('rxMutationById used with: withMutationById', () => {
//   //TODO
//   // it('1- Should expose a mutation with a record of resource by id', async () => {
//   //   const returnedUser = {
//   //     id: '5',
//   //     name: 'John Doe',
//   //     email: 'test@a.com',
//   //   };
//   //   const Store = signalStore(
//   //     withMutationById('user', () =>
//   //       rxMutationById({
//   //         params: () => '5',
//   //         stream: ({ params }) => {
//   //           return of<User>(returnedUser);
//   //         },
//   //         identifier: (params) => params,
//   //       })
//   //     )
//   //   );
//   //   TestBed.configureTestingModule({
//   //     providers: [Store, ApplicationRef],
//   //   });
//   //   const store = TestBed.inject(Store);
//   //   expect(store.userMutationById).toBeDefined();
//   //   await TestBed.inject(ApplicationRef).whenStable();
//   //   expect(store.userMutationById()['5']?.value()).toBe(returnedUser);
//   // });
// });
