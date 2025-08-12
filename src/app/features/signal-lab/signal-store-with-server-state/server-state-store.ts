import { inject, signal, Signal, Type, WritableSignal } from '@angular/core';
import {
  DeepSignal,
  EmptyFeatureResult,
  patchState,
  Prettify,
  SignalState,
  signalState,
  signalStore,
  signalStoreFeature,
  SignalStoreFeature,
  SignalStoreFeatureResult,
  StateSignals,
  withProps,
} from '@ngrx/signals';
import { MergeObject } from './types/util.type';
import {
  createSignalProxy,
  SignalProxy,
  SignalWrapperParams,
} from './signal-proxy';

// flat to the host or not - optional

type PluggableConfig<IsPluggable extends boolean> = {
  isPluggable: IsPluggable;
};

type InferInjectedType<T extends Type<unknown>> = T extends Type<infer U>
  ? U
  : never;

/**
 * pluggableConfig is only used by the withGlobalServerState.
 * It enables to plug some source to the server state store.
 */
export function ServerStateStore<
  const ServerStateName extends string,
  IsPluggable extends false | unknown,
  PluggableParams extends object,
  FeatureResult extends SignalStoreFeatureResult
>(
  serverStateName: ServerStateName,
  feature:
    | (FeatureResult & {
        isPluggable?: IsPluggable;
      })
    // the proxy is used to enable to access the properties of config data that does not exist when the store is created
    // it may only works with one level of properties
    | ((data: SignalProxy<PluggableParams>) => FeatureResult),
  options?: {}
) {
  const capitalizedStateMutationName =
    serverStateName.charAt(0).toUpperCase() + serverStateName.slice(1);
  const isPluggable = 'isPluggable' in feature ? feature.isPluggable : true;

  const pluggableConfig = createSignalProxy(signal({}));
  //@ts-ignore
  const featureResult = isPluggable ? feature(pluggableConfig) : feature;

  const ServerStateStore = signalStore(
    { providedIn: 'root' },
    featureResult as unknown as SignalStoreFeature
  );

  const injectPluggableUserServerState = (pluggableData: PluggableParams) => {
    const store = inject(ServerStateStore);
    pluggableConfig.$set(pluggableData);
    return store;
  };

  const withGlobalServerState = <
    Input extends SignalStoreFeatureResult,
    PluggableConfigInner
  >(
    config?: PluggableConfigInner extends {}
      ? (
          store: Prettify<
            StateSignals<Input['state']> & Input['props'] & Input['methods']
          >
        ) => PluggableConfigInner
      : never
  ): SignalStoreFeature<Input, FeatureResult> => {
    return signalStoreFeature(
      withProps(() => {
        // plug the config into the store
        // return config ? config(signalStore) : {};
        //@ts-ignore
        const globalServerStateStore = inject(ServerStateStore);
        return {
          //@ts-ignore
          ...globalServerStateStore,
        };
      })
    ) as unknown as SignalStoreFeature<Input, FeatureResult>;
  };
  return {
    [`${capitalizedStateMutationName}ServerStateStore`]: ServerStateStore,
    [`withGlobal${capitalizedStateMutationName}ServerState`]:
      withGlobalServerState,
    ...(isPluggable
      ? {
          [`injectPluggable${capitalizedStateMutationName}ServerState`]:
            injectPluggableUserServerState,
          [`set${capitalizedStateMutationName}ServerStateConfig`]: (
            config: PluggableParams | undefined
          ) => {
            if (config) {
              pluggableConfig.$set(config);
            } else {
              pluggableConfig.$set({});
            }
          },
        }
      : {}),
  } as any as MergeObject<
    {
      [key in `${Capitalize<ServerStateName>}ServerStateStore`]: ReturnType<
        typeof signalStore<FeatureResult>
      >;
    } & {
      [key in `withGlobal${Capitalize<ServerStateName>}ServerState`]: typeof withGlobalServerState;
    } & {
      isPluggable: IsPluggable;
    },
    IsPluggable extends false
      ? {}
      : {
          [key in `injectPluggable${Capitalize<ServerStateName>}ServerState`]: (
            data: SignalWrapperParams<PluggableParams>
          ) => InferInjectedType<
            NonNullable<
              ReturnType<
                typeof inject<ReturnType<typeof signalStore<FeatureResult>>>
              >
            >
          >;
        } & {
          [key in `set${Capitalize<ServerStateName>}ServerStateConfig`]: (
            config: SignalWrapperParams<PluggableParams> | undefined
          ) => void;
        }
  >;
}

export function toServerStateStoreResult<
  Feature extends SignalStoreFeature,
  const IsPluggable extends boolean = false
>(
  feature: Feature,
  options?: {
    isPluggable?: IsPluggable;
  }
) {
  type SignalStoreFeatureInferredResult =
    typeof feature extends SignalStoreFeature<EmptyFeatureResult, infer Output>
      ? Output
      : never;
  (feature as any)['isPluggable'] = options?.isPluggable ?? false;
  return feature as unknown as SignalStoreFeatureInferredResult &
    PluggableConfig<IsPluggable>;
}
