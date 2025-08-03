import { TestBed } from '@angular/core/testing';
import { signalStore, withState } from '@ngrx/signals';
import { delay, lastValueFrom, of } from 'rxjs';
import { queryById, withQueryById } from './with-query-by-id';
import { Equal, Expect } from '../../../../../test-type';
import { ApplicationRef, inject, ResourceRef } from '@angular/core';
import { SIGNAL } from '@angular/core/primitives/signals';
import { ResourceByIdRef } from '../resource-by-id';

type User = {
  id: string;
  name: string;
  email: string;
};
// TODO faire un withQuery common et un query ou rxQuery qui renvoie soit une resource ou une rxResource
// ou encore accept aussi queryById ?
// todo handle stream in resourceById

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
  it('1- Should expose a query with a record of resource by id', async () => {
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

  it('2- Should update associated state', async () => {
    const returnedUser = {
      id: '5',
      name: 'John Doe',
      email: 'test@a.com',
    };
    const Store = signalStore(
      withState({
        usersFetched: [] as User[],
        lastUserFetched: undefined as User | undefined,
      }),
      withQueryById(
        'user',
        () =>
          queryById({
            params: () => '5',
            loader: ({ params }) => {
              return lastValueFrom(of<User>(returnedUser).pipe(delay(10)));
            },
            identifier: (params) => params,
          }),
        (store) => ({
          state: {
            usersFetched: ({
              queryParams,
              queryResource,
              queryIdentifier,
              queryResources,
            }) => {
              type ExpectQueryParamsToBeTyped = Expect<
                Equal<typeof queryParams, string>
              >;
              console.log('queryParams', queryParams);
              expect(queryParams).toBe('5');

              type ExpectQueryResourceToBeTyped = Expect<
                Equal<typeof queryResource, ResourceRef<User>>
              >;
              expect(queryResource.value()).toBe(returnedUser);

              type ExpectLastResolvedResourceIdentifierToBeTyped = Expect<
                Equal<typeof queryIdentifier, string>
              >;
              console.log('queryIdentifier', queryIdentifier);
              expect(queryIdentifier).toBe('5');

              type ExpectLastResolvedResourceToBeTyped = Expect<
                Equal<
                  typeof queryResources,
                  ResourceByIdRef<string, NoInfer<User>>
                >
              >;
              expect(Object.entries(queryResources()).length).toEqual(1);
              expect(queryResources()['5']?.value()).toEqual(returnedUser);

              expect(store.usersFetched().length).toEqual(0);
              return [
                ...store
                  .usersFetched()
                  .filter((user) => user.id !== queryResource.value()?.id),
                queryResource.value(),
              ];
            },
          },
        })
      )
    );

    TestBed.configureTestingModule({
      providers: [Store, ApplicationRef],
    });
    const store = TestBed.inject(Store);
    console.log('store.userQueryById', store.userQueryById);
    expect(store.usersFetched().length).toBe(0);

    await TestBed.inject(ApplicationRef).whenStable();
    expect(store.userQueryById()['5']?.value()).toBe(returnedUser);

    type ExpectUserQueryToBeAnObjectWithResourceByIdentifier = Expect<
      Equal<typeof store.userQueryById, ResourceByIdRef<string, NoInfer<User>>>
    >;
    console.log('store.usersFetched()', store.usersFetched());
    expect(store.usersFetched().length).toBe(1);
    expect(store.usersFetched()[0]).toBe(returnedUser);
  });
});

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
