import { TestBed } from '@angular/core/testing';
import { signalStore } from '@ngrx/signals';
import { lastValueFrom, of } from 'rxjs';
import { queryById, withQueryById } from './with-query-by-id';
import { Equal, Expect } from '../../../../../test-type';
import { ApplicationRef, inject, ResourceRef } from '@angular/core';
import { SIGNAL } from '@angular/core/primitives/signals';

type User = {
  id: string;
  name: string;
  email: string;
};
// TODO faire un withQuery common et un query ou rxQuery qui renvoie soit une resource ou une rxResource
// ou encore accept aussi queryById ?

describe('queryById', () => {
  it('Retrieve returned types of queryByIdFn', () => {
    const queryByIdFn = queryById({
      params: () => '5',
      loader: ({ params }) => {
        return lastValueFrom(
          of({
            id: params,
            name: 'John Doe',
            email: 'test@a.com',
          })
        );
      },
      identifier: (params) => params,
    });
    type queryByIdFn__types = ReturnType<typeof queryByIdFn>['__types'];

    type ExpectQueryByFnTypesToBeRetrieved = Expect<
      Equal<
        queryByIdFn__types,
        {
          state: NoInfer<{
            id: string;
            name: string;
            email: string;
          }>;
          params: string;
          args: unknown;
          isGroupedResource: false;
          groupIdentifier: string;
        }
      >
    >;
  });
});
describe('withQueryById', () => {
  it('1- Should expose a query resource', async () => {
    const returnedUser = {
      id: '5',
      name: 'John Doe',
      email: 'test@a.com',
    };
    const Store = signalStore(
      withQueryById('user', () =>
        queryById({
          params: () => '5',
          loader: ({ params }) => {
            return lastValueFrom(of<User>(returnedUser));
          },
          identifier: (params) => params,
        })
      )
    );

    TestBed.configureTestingModule({
      providers: [Store, ApplicationRef],
    });
    const store = TestBed.inject(Store);
    console.log('store.userQueryById', store.userQueryById);
    expect(store.userQueryById).toBeDefined();

    await TestBed.inject(ApplicationRef).whenStable();
    expect(store.userQueryById()['5']?.value()).toBe(returnedUser);

    type ExpectUserQueryToBeAnObjectWithResourceByIdentifier = Expect<
      Equal<
        typeof store.userQueryById,
        (() => {
          [x: string]: ResourceRef<User> | undefined;
        }) & {
          [SIGNAL]: unknown;
        }
      >
    >;
  });
});

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
