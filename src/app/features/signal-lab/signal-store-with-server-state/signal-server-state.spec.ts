import { signalStore, signalStoreFeature, withState } from '@ngrx/signals';
import { ServerState, toSignalStoreFeatureResult } from './signal-server-state';
import { withMutation } from './with-mutation';
import { rxMutation } from './rx-mutation';
import { of } from 'rxjs';
import { withQuery } from './with-query';
import { rxQuery } from './rx-query';
import { TestBed } from '@angular/core/testing';
import { Equal, Expect } from '../../../../../test-type';

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
    const { UserServerStateStore, withGlobalUserServerState } = ServerState(
      'user' as const,
      toSignalStoreFeatureResult(serverStateFeature)
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

  // todo test one instance of server state store after
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

    const { UserServerStateStore } = ServerState(
      'user',
      toSignalStoreFeatureResult(serverStateFeature)
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

    const { withGlobalUserServerState } = ServerState(
      'user',
      toSignalStoreFeatureResult(serverStateFeature)
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
    expect(consumerUserServerStateStore.updateNameMutation).toBeDefined();
    expect(consumerUserServerStateStore.userQuery).toBeDefined();
    expect(consumerUserServerStateStore.mutateUpdateName).toBeDefined();
  });
});
