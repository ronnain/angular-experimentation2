import { EffectRef, effect, ResourceRef } from '@angular/core';
import {
  Prettify,
  SignalStoreFeatureResult,
  StateSignals,
  WritableStateSource,
  SignalStoreFeature,
  EmptyFeatureResult,
  signalStoreFeature,
  withState,
  withProps,
  patchState,
} from '@ngrx/signals';
import { ResourceByIdRef } from '../../resource-by-id';
import { ResourceData } from '../signal-store-with-server-state';

type ResourceByIdResult<
  GroupIdentifier extends string | number,
  State extends object | undefined
> = Prettify<Partial<Record<GroupIdentifier, ResourceData<State>>>>;

export function withQueryById<
  Input extends SignalStoreFeatureResult,
  const ResourceName extends string,
  State extends object | undefined,
  GroupIdentifier extends string | number
>(
  resourceName: ResourceName,
  queryFactory: (
    store: Prettify<
      StateSignals<Input['state']> &
        Input['props'] &
        Input['methods'] & // todo remove methods ?
        WritableStateSource<Prettify<Input['state']>>
    >
  ) => ResourceByIdRef<GroupIdentifier, State>
): SignalStoreFeature<
  Input,
  {
    state: {
      [key in ResourceName]: ResourceByIdResult<GroupIdentifier, State>;
    };
    props: {
      // todo maybe omit this effect ?
      [key in `_${ResourceName}Effect`]: EffectRef;
    };
    methods: {};
  }
> {
  return ((store: EmptyFeatureResult) => {
    const resource = queryFactory({
      //@ts-ignore
      ...store.stateSignals,
    } as unknown as StateSignals<Input['state']> &
      Input['props'] &
      Input['methods'] & // todo remove methods ?
      WritableStateSource<Prettify<Input['state']>>);
    const result = resource();
    const subResult = result['1' as GroupIdentifier];
    subResult?.value();

    return signalStoreFeature(
      withState({
        // todo handle first state
        [resourceName]: {} as ResourceByIdResult<GroupIdentifier, State>,
      }),
      withProps((store) => ({
        [`_${resourceName}Effect`]: effect(() => {
          patchState(store, () => {
            const resourceByGroup = Object.entries(resource()).reduce(
              (acc, cur) => {
                const [group, resourceGrouped] = cur as [
                  GroupIdentifier,
                  ResourceRef<State>
                ];
                acc[group] = {
                  // todo check to remove as GroupIdentifier
                  value: (resourceGrouped.hasValue()
                    ? resourceGrouped.value()
                    : undefined) as State,
                  status: {
                    isLoading: resourceGrouped.isLoading(),
                    isLoaded: resourceGrouped.status() === 'resolved',
                    hasError: resourceGrouped.status() === 'error',
                    status: resourceGrouped.status(),
                    error: resourceGrouped.error(),
                  },
                };
                return acc;
              },
              {} as ResourceByIdResult<GroupIdentifier, State>
            );
            return {
              [resourceName]: {
                ...resourceByGroup,
              },
            };
          });
        }),
      }))
      //@ts-ignore
    )(store); // todo fix that error !
  }) as unknown as SignalStoreFeature<
    Input,
    {
      state: {
        [key in ResourceName]: ResourceByIdResult<GroupIdentifier, State>;
      };
      props: {
        [key in `_${ResourceName}Effect`]: EffectRef;
      };
      methods: {};
    }
  >;
}
