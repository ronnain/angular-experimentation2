import { ResourceRef, EffectRef, effect } from '@angular/core';
import {
  patchState,
  Prettify,
  SignalStoreFeature,
  signalStoreFeature,
  SignalStoreFeatureResult,
  StateSignals,
  withProps,
  withState,
  WritableStateSource,
} from '@ngrx/signals';
import {
  ResourceData,
  ResourceStatusData,
} from './signal-store-with-server-state';
import { ObjectDeepPath } from './object-deep-path-mapper.type';
import {
  AccessTypeObjectPropertyByDottedPath,
  DottedPathPathToTuple,
} from './access-type-object-property-by-dotted-path.type';

// todo add queryChange: [associateToAClientStatePath('balba.bla.bla, ?(store, resource) => ...)]
export function withQuery<
  Input extends SignalStoreFeatureResult,
  const ResourceName extends string,
  const ClientStateDottedPath extends ObjectDeepPath<Input['state']>,
  ResourceState extends object | undefined,
  const ClientStateTypeByDottedPath extends AccessTypeObjectPropertyByDottedPath<
    Input['state'],
    ClientStateDottedPathTuple
  >,
  const ClientStateDottedPathTuple extends DottedPathPathToTuple<
    ClientStateDottedPath & string
  > = DottedPathPathToTuple<ClientStateDottedPath & string>
>(
  resourceName: ResourceName,
  queryFactory: (
    store: Prettify<
      StateSignals<Input['state']> &
        Input['props'] &
        Input['methods'] & // todo remove methods ?
        WritableStateSource<Prettify<Input['state']>>
    >
  ) => ResourceRef<ResourceState>,
  options?: {
    /**
     * Will update the state at the given path with the resource data.
     * If the path does not exist, it will be created.
     */
    clientStatePath: ClientStateDottedPath;
    mapResourceToState: (data: {
      store: Prettify<
        StateSignals<Input['state']> &
          Input['props'] &
          Input['methods'] & // todo remove methods ?
          WritableStateSource<Prettify<Input['state']>>
      >;
      resource: ResourceRef<ResourceState>;
    }) => ClientStateTypeByDottedPath;
    associatedStateType?: ClientStateTypeByDottedPath;
    tuple?: ClientStateDottedPathTuple;
    state?: Input['state'];
    testState: ResourceState;
  }
): SignalStoreFeature<
  Input,
  {
    state: { [key in ResourceName]: ResourceData<ResourceState> };
    props: {
      [key in `_${ResourceName}Effect`]: EffectRef;
    };
    methods: {};
  }
> {
  return ((store: SignalStoreFeatureResult) => {
    const resource = queryFactory(
      store as unknown as StateSignals<Input['state']> &
        Input['props'] &
        Input['methods'] & // todo remove methods ?
        WritableStateSource<Prettify<Input['state']>>
    );

    return signalStoreFeature(
      withState({
        [resourceName]: {
          value: resource.value() as ResourceState | undefined,
          status: {
            isLoading: false,
            isLoaded: false,
            hasError: false,
            status: 'idle',
            error: undefined,
          } satisfies ResourceStatusData as ResourceStatusData,
        },
      }),
      withProps((store) => ({
        [`_${resourceName}Effect`]: effect(() => {
          patchState(store, (state) => ({
            [resourceName]: {
              value: resource.hasValue()
                ? resource.value()
                : (state[resourceName].value as ResourceState),
              status: {
                isLoading: resource.isLoading(),
                isLoaded: resource.status() === 'resolved',
                hasError: resource.status() === 'error',
                status: resource.status(),
                error: resource.error(),
              },
            } satisfies ResourceData<ResourceState>,
          }));
        }),
      }))
      //@ts-ignore
    )(store);
  }) as unknown as SignalStoreFeature<
    Input,
    {
      state: { [key in ResourceName]: ResourceData<ResourceState> };
      props: {
        [key in `_${ResourceName}Effect`]: EffectRef;
      };
      methods: {};
    }
  >;
}
