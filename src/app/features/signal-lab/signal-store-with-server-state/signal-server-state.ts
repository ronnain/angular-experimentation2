import { inject, signal, Signal, Type } from '@angular/core';
import {
  EmptyFeatureResult,
  Prettify,
  signalStore,
  signalStoreFeature,
  SignalStoreFeature,
  SignalStoreFeatureResult,
  StateSignals,
  withProps,
} from '@ngrx/signals';
import { MergeObject } from './types/util.type';

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
export function ServerState<
  const ServerStateName extends string,
  IsPluggable extends false | unknown,
  PluggableParams,
  FeatureResult extends SignalStoreFeatureResult
>(
  serverStateName: ServerStateName,
  feature:
    | (FeatureResult & {
        isPluggable?: IsPluggable;
      })
    | ((data: Signal<PluggableParams | undefined>) => FeatureResult),
  options?: {}
) {
  const capitalizedStateMutationName =
    serverStateName.charAt(0).toUpperCase() + serverStateName.slice(1);
  const isPluggable = 'isPluggable' in feature ? feature.isPluggable : true;

  // todo improve the DX by using a proxy to generated needed signals that needs to be accessed
  const pluggableConfig = signal<PluggableParams | undefined>(undefined);
  //@ts-ignore
  const featureResult = isPluggable ? feature(pluggableConfig) : feature;

  const ServerStateStore = signalStore(
    { providedIn: 'root' },
    featureResult as unknown as SignalStoreFeature
  );

  const injectPluggableUserServerState = (pluggableData: PluggableParams) => {
    const store = inject(ServerStateStore);
    pluggableConfig.set(pluggableData);
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
  // todo expose configPlug
  return {
    [`${capitalizedStateMutationName}ServerStateStore`]: ServerStateStore,
    [`withGlobal${capitalizedStateMutationName}ServerState`]:
      withGlobalServerState,
    ...(isPluggable
      ? {
          [`injectPluggable${capitalizedStateMutationName}ServerState`]:
            injectPluggableUserServerState,
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
            data: PluggableParams
          ) => InferInjectedType<
            NonNullable<
              ReturnType<
                typeof inject<ReturnType<typeof signalStore<FeatureResult>>>
              >
            >
          >;
        }
  >;
}

export function toSignalStoreFeatureResult<
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
