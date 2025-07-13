import { ResourceRef, effect } from '@angular/core';
import {
  patchState,
  Prettify,
  SignalStoreFeature,
  signalStoreFeature,
  SignalStoreFeatureResult,
  StateSignals,
  withProps,
  WritableStateSource,
} from '@ngrx/signals';
import { MergeObject } from './types/util.type';
import { Merge } from '../../../util/types/merge';
import { createNestedStateUpdate } from './update-state.util';
import { ObjectDeepPath } from './types/object-deep-path-mapper.type';
import {
  AccessTypeObjectPropertyByDottedPath,
  DottedPathPathToTuple,
} from './types/access-type-object-property-by-dotted-path.type';

// todo withLinkedClientStatePath("bla.bla.bla", ["userQuery", {resourceName: "userUpdate", mapResourceToState: (store, resource) => ...}])
// withState(withLinkedClientStatePath({user:{...}}, ["userQuery", {resourceName: "userUpdate", mapResourceToState: (store, resource) => ...}]))
// todo add queryChange: [associateToAClientStatePath('balba.bla.bla, ?(store, resource) => ...)]
export function withQuery<
  StateTest extends object | undefined,
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
  ) =>
    | ResourceRef<ResourceState>
    | MergeObject<
        {
          resource: ResourceRef<ResourceState>;
          /**
           * Will update the state at the given path with the resource data.
           * If the state associated to the path does not exist, it will be created.
           */
          clientStatePath: ClientStateDottedPath;
          mapResourceToState?: (data: {
            resource: ResourceRef<NoInfer<ResourceState>>;
          }) => NoInfer<ClientStateTypeByDottedPath>;
        },
        NoInfer<ResourceState> extends ClientStateTypeByDottedPath
          ? {
              mapResourceToState?: (data: {
                resource: ResourceRef<NoInfer<ResourceState>>;
              }) => NoInfer<ClientStateTypeByDottedPath>;
            }
          : {
              mapResourceToState: (data: {
                resource: ResourceRef<NoInfer<ResourceState>>;
              }) => NoInfer<ClientStateTypeByDottedPath>;
            }
      >
): SignalStoreFeature<
  Input,
  {
    state: {};
    props: Merge<
      { [key in ResourceName]: ResourceRef<ResourceState> },
      {
        __query: {
          [key in ResourceName]: ResourceState;
        };
      }
    >;
    methods: {};
  }
> {
  return ((store: SignalStoreFeatureResult) => {
    const queryConfig = queryFactory(
      store as unknown as StateSignals<Input['state']> &
        Input['props'] &
        Input['methods'] &
        WritableStateSource<Prettify<Input['state']>>
    );
    const resource =
      typeof queryConfig === 'object' && 'resource' in queryConfig
        ? queryConfig.resource
        : queryConfig;

    return signalStoreFeature(
      withProps((store) => ({
        [resourceName]: resource,
        ...('clientStatePath' in queryConfig && {
          [`_${resourceName}Effect`]: effect(() => {
            if (!['resolved', 'local'].includes(resource.status())) {
              return;
            }
            patchState(store, (state) => {
              const resourceData = resource.hasValue()
                ? (resource.value() as ResourceState | undefined)
                : undefined;
              const clientStatePath = queryConfig.clientStatePath;
              const mappedResourceToState =
                'mapResourceToState' in queryConfig
                  ? queryConfig.mapResourceToState({ resource })
                  : resourceData;
              const keysPath = (clientStatePath as string).split('.');

              return createNestedStateUpdate({
                state,
                keysPath,
                value: mappedResourceToState,
              });
            });
          }),
        }),
      }))
      //@ts-ignore
    )(store);
  }) as unknown as SignalStoreFeature<
    Input,
    {
      state: {};
      props: Merge<
        { [key in ResourceName]: ResourceRef<ResourceState> },
        {
          __query: {
            [key in ResourceName]: ResourceState;
          };
        }
      >;
      methods: {};
    }
  >;
}
