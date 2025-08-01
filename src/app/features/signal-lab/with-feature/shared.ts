import {
  Prettify,
  SignalStoreFeature,
  SignalStoreFeatureResult,
  StateSignals,
  withFeature,
  WritableStateSource,
} from '@ngrx/signals';

export type Book = {
  id: string;
  name: string;
  author: string;
};

export type StoreInput<Input extends SignalStoreFeatureResult> = Prettify<
  StateSignals<Input['state']> &
    Input['props'] &
    Input['methods'] &
    WritableStateSource<Prettify<Input['state']>>
>;

export type FeatureOutput<
  Input extends SignalStoreFeatureResult,
  Feature extends (data: any) => SignalStoreFeature
> = ReturnType<Feature> extends SignalStoreFeature<
  infer ResultInput,
  infer ResultOutput
>
  ? SignalStoreFeature<Input, ResultOutput>
  : never;

export function featureFactory<
  Input extends SignalStoreFeatureResult,
  Store extends StoreInput<Input>
>(
  featureConfigFactory: (store: Store) => any,
  featureFactory: (oneArg: any) => any
): SignalStoreFeature<Input, any> {
  return withFeature((context) =>
    featureFactory(featureConfigFactory(context as Store))
  );
}

export type OneParams<Feature extends (data: any) => SignalStoreFeature> =
  Feature extends (data: infer Params) => SignalStoreFeature ? Params : never;

// It only check at the root level, not nested properties
export type GetMatchedPaths<State extends object, TargetedType> = {
  [Key in keyof State]: State[Key] extends TargetedType
    ? Key
    : State[Key] extends object
    ? GetMatchedPaths<State[Key], TargetedType>
    : never;
}[keyof State];
