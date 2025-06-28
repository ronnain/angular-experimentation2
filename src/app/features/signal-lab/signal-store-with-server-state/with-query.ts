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
import { MakeOptionalPropertiesRequired } from './util.type';

export type TypeObjectPropertyByPathAccess<
  State extends object,
  DottedPathPathTuple extends string[]
> = DottedPathPathTuple extends [infer Head, ...infer Tail]
  ? Head extends keyof State
    ? Tail extends string[]
      ? Tail['length'] extends 0
        ? State[Head]
        : MakeOptionalPropertiesRequired<
            State[Head]
          > extends infer RequiredStateHead
        ? RequiredStateHead extends object
          ? TypeObjectPropertyByPathAccess<RequiredStateHead, Tail>
          : 'lol'
        : 'Head'
      : State[Head]
    : never
  : never;

// Split path by dot and access and make a tuple
// Recursive loop to access the property by path

export type DottedPathPathToTuple<
  DottedPath extends string,
  Tuple extends string[] = []
> = DottedPath extends `${infer Head}.${infer Tail}`
  ? DottedPathPathToTuple<Tail, [...Tuple, Head]>
  : [...Tuple, DottedPath];

export function withQuery<
  Input extends SignalStoreFeatureResult,
  const ResourceName extends string,
  const ClientStatePath extends ObjectDeepPath<Input['state']>,
  TargetedStateType extends ClientStatePath extends keyof Input['state']
    ? Input['state'][ClientStatePath]
    : never,
  State extends object | undefined
>(
  resourceName: ResourceName,
  queryFactory: (
    store: Prettify<
      StateSignals<Input['state']> &
        Input['props'] &
        Input['methods'] & // todo remove methods ?
        WritableStateSource<Prettify<Input['state']>>
    >
  ) => ResourceRef<State>,
  options?: {
    clientStatePath: ClientStatePath;
    associatedStateType: TargetedStateType;
  }
): SignalStoreFeature<
  Input,
  {
    state: { [key in ResourceName]: ResourceData<State> };
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
          value: resource.value() as State | undefined,
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
                : (state[resourceName].value as State),
              status: {
                isLoading: resource.isLoading(),
                isLoaded: resource.status() === 'resolved',
                hasError: resource.status() === 'error',
                status: resource.status(),
                error: resource.error(),
              },
            } satisfies ResourceData<State>,
          }));
        }),
      }))
      //@ts-ignore
    )(store);
  }) as unknown as SignalStoreFeature<
    Input,
    {
      state: { [key in ResourceName]: ResourceData<State> };
      props: {
        [key in `_${ResourceName}Effect`]: EffectRef;
      };
      methods: {};
    }
  >;
}
