import {
  DeepSignal,
  SignalState,
  signalStore,
  signalStoreFeature,
  withProps,
  withState,
} from '@ngrx/signals';
import {
  ServerStateStore,
  toServerStateStoreResult,
} from './server-state-store';
import { withMutation } from './with-mutation';
import { rxMutation } from './rx-mutation';
import { of } from 'rxjs';
import { withQuery } from './with-query';
import { rxQuery } from './rx-query';
import { TestBed } from '@angular/core/testing';
import { Equal, Expect } from '../../../../../test-type';
import { signal, Signal } from '@angular/core';
import { IsAny } from './types/util.type';
import { expectTypeOf } from 'vitest';

type User = {
  id: string;
  name: string;
};
describe('SignalServerState', () => {
  it('1-should create an instance', () => {
    const serverStateFeature = signalStoreFeature(
      withMutation('updateName', () =>
        rxMutation({
          method: (user: User) => user,
          stream: ({ params: user }) => of(user),
        })
      ),
      withQuery('user', () =>
        rxQuery({
          params: () => '1',
          stream: ({ params }) =>
            of({
              id: params,
              name: 'Romain',
            }),
        })
      )
    );

    const { UserServerStateStore, withGlobalUserServerState } =
      ServerStateStore(
        'user' as const,
        toServerStateStoreResult(serverStateFeature)
      );
    const test = ServerStateStore(
      'user' as const,
      toServerStateStoreResult(serverStateFeature)
    );
    expect(UserServerStateStore).toBeDefined();
    expect(withGlobalUserServerState).toBeDefined();

    const consumerStore = signalStore(
      withState({
        selectedId: '1',
      }),
      withGlobalUserServerState()
    );
  });

  it('2-should inject a store and expose global server state api', () => {
    const serverStateFeature = signalStoreFeature(
      withMutation('updateName', () =>
        rxMutation({
          method: (user: User) => user,
          stream: ({ params: user }) => of(user),
        })
      ),
      withQuery('user', () =>
        rxQuery({
          params: () => '1',
          stream: ({ params }) =>
            of({
              id: params,
              name: 'Romain',
            }),
        })
      )
    );

    const { UserServerStateStore } = ServerStateStore(
      'user',
      toServerStateStoreResult(serverStateFeature)
    );

    TestBed.configureTestingModule({
      providers: [UserServerStateStore],
    });
    const userServerStateStore = TestBed.inject(UserServerStateStore);

    type ExpectServerStateStorePropertiesToBeExposed = Expect<
      Equal<

          | 'updateNameMutation'
          | 'userQuery'
          | 'mutateUpdateName' extends keyof typeof userServerStateStore
          ? true
          : false,
        true
      >
    >;

    expect(userServerStateStore).toBeDefined();
    expect(userServerStateStore.updateNameMutation).toBeDefined();
    expect(userServerStateStore.userQuery).toBeDefined();
    expect(userServerStateStore.mutateUpdateName).toBeDefined();
  });

  it('3-should you the withServerState in signalStore and expose global server state api', () => {
    const serverStateFeature = signalStoreFeature(
      withMutation('updateName', () =>
        rxMutation({
          method: (user: User) => user,
          stream: ({ params: user }) => of(user),
        })
      ),
      withQuery('user', () =>
        rxQuery({
          params: () => '1',
          stream: ({ params }) =>
            of({
              id: params,
              name: 'Romain',
            }),
        })
      )
    );

    const { withGlobalUserServerState } = ServerStateStore(
      'user',
      toServerStateStoreResult(serverStateFeature)
    );

    const ConsumerStore = signalStore(
      withState({
        selectedId: '1',
      }),
      withGlobalUserServerState()
    );

    TestBed.configureTestingModule({
      providers: [ConsumerStore],
    });
    const consumerUserServerStateStore = TestBed.inject(ConsumerStore);

    type ExpectServerStateStorePropertiesToBeExposed = Expect<
      Equal<

          | 'updateNameMutation'
          | 'userQuery'
          | 'mutateUpdateName' extends keyof typeof consumerUserServerStateStore
          ? true
          : false,
        true
      >
    >;

    expect(consumerUserServerStateStore).toBeDefined();
    expect(consumerUserServerStateStore.updateNameMutation.value).toBeDefined();
    expect(consumerUserServerStateStore.userQuery.value).toBeDefined();
    expect(consumerUserServerStateStore.mutateUpdateName).toBeDefined();
  });

  it('4- should inject a single instance of server state store', () => {
    let instanceCount = 0;
    const serverStateFeature = signalStoreFeature(
      withMutation('updateName', () =>
        rxMutation({
          method: (user: User) => user,
          stream: ({ params: user }) => of(user),
        })
      ),
      withQuery('user', () =>
        rxQuery({
          params: () => '1',
          stream: ({ params }) =>
            of({
              id: params,
              name: 'Romain',
            }),
        })
      ),
      withProps(() => {
        instanceCount++;
        return {};
      })
    );

    const { UserServerStateStore, withGlobalUserServerState, isPluggable } =
      ServerStateStore('user', toServerStateStoreResult(serverStateFeature));
    const isPluggableT = isPluggable;
    //    ^?

    const ConsumerStore = signalStore(
      withState({
        selectedId: '1',
      }),
      withGlobalUserServerState()
    );

    TestBed.configureTestingModule({
      providers: [UserServerStateStore, ConsumerStore],
    });
    const userServerStateStore = TestBed.inject(UserServerStateStore);
    type ExpectSuerStoreNotAny = Expect<
      Equal<IsAny<typeof userServerStateStore>, false>
    >;
    const consumerServerStateStore = TestBed.inject(ConsumerStore);

    type ExpectConsumerServerStateStoreNotAny = Expect<
      Equal<IsAny<typeof consumerServerStateStore>, false>
    >;

    expect(userServerStateStore).toBeDefined();
    expect(consumerServerStateStore).toBeDefined();
    expect(instanceCount).toBe(1);
  });

  it('5- should enable to set the pluggable config by using the custom inject server state store', () => {
    const {
      injectPluggableUserServerState,
      withGlobalUserServerState,
      isPluggable,
    } = ServerStateStore(
      'user',
      // todo improve the DX by using a proxy to generated needed signals that needs to be accessed
      (
        dataS: { selectedId: Signal<string | undefined> } = {
          selectedId: signal(undefined),
        }
      ) =>
        toServerStateStoreResult(
          signalStoreFeature(
            withMutation('updateName', () =>
              rxMutation({
                method: (user: User) => user,
                stream: ({ params: user }) => of(user),
              })
            ),
            withQuery('user', () => {
              return rxQuery({
                params: dataS.selectedId,
                stream: ({ params }) =>
                  of({
                    id: params,
                    name: 'Romain',
                  }),
              });
            })
          ),
          {
            isPluggable: true,
          }
        )
    );

    const ConsumerStore = signalStore(
      { providedIn: 'root' },
      withState({
        selectedId: '1',
      }),
      withGlobalUserServerState()
    );

    TestBed.runInInjectionContext(() => {
      const selectedId = signal('1');
      const userServerStateStore = injectPluggableUserServerState({
        selectedId,
      });

      const consumerServerStateStore = TestBed.inject(ConsumerStore);

      expect(userServerStateStore).toBeDefined();
      expect(consumerServerStateStore).toBeDefined();
      expect(instanceCount).toBe(1);
      expectTypeOf(
        userServerStateStore.userQuery.value()
      ).toEqualTypeOf<User>();
    });
  });

  // todo add tests about the proxy & set..UpdateConfig
});
