import {
  EmptyFeatureResult,
  Prettify,
  signalStore,
  SignalStoreFeature,
  SignalStoreFeatureResult,
  StateSignals,
  WritableStateSource,
} from '@ngrx/signals';
import { S } from 'vitest/dist/chunks/config.d.D2ROskhv.js';

// flat to the host or not - optional

/**
 * pluggableConfig is only used by the withGlobalServerState.
 * It enables to plug some source to the server state store.
 */
export function ServerState<
  const ServerStateName extends string,
  PluggableConfig,
  FeatureResult extends SignalStoreFeatureResult
>(serverStateName: ServerStateName, feature: FeatureResult, options?: {}) {
  const capitalizedStateMutationName =
    serverStateName.charAt(0).toUpperCase() + serverStateName.slice(1);

  const serverStateStore = signalStore(
    { providedIn: 'root' },
    feature as unknown as SignalStoreFeature
  );

  const withGlobalServerState = <
    Input extends SignalStoreFeatureResult,
    PluggableConfig
  >(
    config?: PluggableConfig extends {}
      ? (
          store: Prettify<
            StateSignals<Input['state']> & Input['props'] & Input['methods']
          >
        ) => PluggableConfig
      : never
  ): SignalStoreFeature<Input, FeatureResult> => {
    // todo return the feature that may be pluged !
    return config as unknown as SignalStoreFeature<Input, FeatureResult>;
  };
  return {
    [`${capitalizedStateMutationName}ServerStateStore`]: serverStateStore,
    [`with${capitalizedStateMutationName}ServerState`]: withGlobalServerState,
  } as any as {
    [key in `${Capitalize<ServerStateName>}ServerStateStore`]: ReturnType<
      typeof signalStore<FeatureResult>
    >;
  } & {
    [key in `withGlobal${Capitalize<ServerStateName>}ServerState`]: typeof withGlobalServerState;
  };
}

export function toSignalStoreFeatureResult<Feature extends SignalStoreFeature>(
  feature: Feature
) {
  type Re = typeof feature extends SignalStoreFeature<
    EmptyFeatureResult,
    infer Output
  >
    ? Output
    : never;
  return feature as unknown as Re;
}
