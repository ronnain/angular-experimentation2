import { signalStore, withState } from '@ngrx/signals';
import { query } from '../query';
import {
  withCachedQueryFactory,
  withCachedQueryToPlugFactory,
} from './with-cached-query-factory';
import { withMutation } from '../with-mutation';
import { rxMutation } from '../rx-mutation';
import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { Equal, Expect } from '../../../../../../test-type';
import { ResourceRef, signal, Signal } from '@angular/core';
import { SignalProxy } from '../signal-proxy';

describe('withCachedQueryFactory', () => {
  it('should create a typed withQuery for the signal store', () => {
    TestBed.runInInjectionContext(() => {
      const queryRef = query({
        params: () => ({ id: 1 }),
        loader: ({ params }) =>
          Promise.resolve({ id: params?.id, name: 'Romain' }),
      });
      const withUserQuery = withCachedQueryFactory(
        'user',
        query({
          params: () => ({ id: 1 }),
          loader: ({ params }) =>
            Promise.resolve({ id: params?.id, name: 'Romain' }),
        })
      );

      expect(withUserQuery).toBeDefined();

      const store = signalStore(
        {
          providedIn: 'root',
        },
        withState({ selected: '1' }),
        withMutation('name', () =>
          rxMutation({
            method: (name: string) => name,
            stream: ({ params }) => of({ id: '4', name: params }),
          })
        ),
        withUserQuery((store) => ({
          on: {
            nameMutation: {},
          },
        }))
      );
      const signalStoreInstance = TestBed.inject(store);

      type ExpectQueryToBeDefined = Expect<
        Equal<
          typeof signalStoreInstance.userQuery,
          ResourceRef<{
            id: number;
            name: string;
          }>
        >
      >;

      expect(signalStoreInstance.userQuery).toBeDefined();
    });
  });

  it('should create a typed withQuery for the signal store that can be plugged to the store', () => {
    TestBed.runInInjectionContext(() => {
      const queryRefToPlug = (userSelected: SignalProxy<{ id: number }>) =>
        query({
          params: userSelected.id,
          loader: ({ params }) =>
            Promise.resolve({ id: params, name: 'Romain' }),
        });
      const withUserQuery = withCachedQueryToPlugFactory(
        'user',
        queryRefToPlug
      );

      expect(withUserQuery).toBeDefined();

      const store = signalStore(
        {
          providedIn: 'root',
        },
        withState({ selected: { id: 1 } }),
        withMutation('name', () =>
          rxMutation({
            method: (name: string) => name,
            stream: ({ params }) => of({ id: '4', name: params }),
          })
        ),
        withUserQuery((store) => ({
          dataToPlug: { id: store.selected.id },
        }))
      );
      const signalStoreInstance = TestBed.inject(store);

      type ExpectQueryToBeDefined = Expect<
        Equal<
          typeof signalStoreInstance.userQuery,
          ResourceRef<{
            id: number;
            name: string;
          }>
        >
      >;
      const t = signal(true);
      expect(signalStoreInstance.userQuery).toBeDefined();
    });
  });
});
