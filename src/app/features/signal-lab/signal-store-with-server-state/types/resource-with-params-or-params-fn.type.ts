import {
  ResourceLoader,
  ResourceLoaderParams,
  ResourceOptions,
} from '@angular/core';
import {
  Prettify,
  SignalStoreFeatureResult,
  StateSignals,
  WritableStateSource,
} from '@ngrx/signals';

export type ResourceWithParamsOrParamsFn<
  Input extends SignalStoreFeatureResult,
  ResourceState,
  Params,
  ParamsArgs
> =
  | Omit<ResourceOptions<NoInfer<ResourceState>, Params>, 'params' | 'loader'> &
      (
        | {
            /**
             * A reactive function which determines the request to be made. Whenever the request changes, the
             * loader will be triggered to fetch a new value for the resource.
             *
             * If a request function isn't provided, the loader won't rerun unless the resource is reloaded.
             */
            params: (
              store: Prettify<
                StateSignals<Input['state']> &
                  Input['props'] &
                  Input['methods'] & // todo remove methods ?
                  WritableStateSource<Prettify<Input['state']>>
              >
            ) => () => Params;
            loader: (
              param: ResourceLoaderParams<NoInfer<Params>>
            ) => Promise<ResourceState>;
            method?: never;
          }
        | {
            /**
             * Used to generate a method in the store, when called will trigger the resource loader/stream.
             * TODO PENSER A METTRE UN EQUAL TRUE ?
             */
            // TODO RENAME method accoding to signalStore
            method: (
              store: Prettify<
                StateSignals<Input['state']> &
                  Input['props'] &
                  Input['methods'] & // todo remove methods ?
                  WritableStateSource<Prettify<Input['state']>>
              >
            ) => (args: ParamsArgs) => Params;
            loader: (
              param: ResourceLoaderParams<NoInfer<Params>>
            ) => Promise<ResourceState>;
            params?: never;
          }
      );
