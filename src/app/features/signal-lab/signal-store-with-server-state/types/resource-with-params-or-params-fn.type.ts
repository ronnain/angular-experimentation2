import {
  ResourceLoader,
  ResourceLoaderParams,
  ResourceOptions,
  ResourceStreamingLoader,
} from '@angular/core';

export type ResourceWithParamsOrParamsFn<ResourceState, Params, ParamsArgs> =
  | Omit<ResourceOptions<NoInfer<ResourceState>, Params>, 'params' | 'loader'> &
      (
        | {
            /**
             * A reactive function which determines the request to be made. Whenever the request changes, the
             * loader will be triggered to fetch a new value for the resource.
             *
             * If a request function isn't provided, the loader won't rerun unless the resource is reloaded.
             */
            params: () => Params;
            loader: (
              param: NoInfer<ResourceLoaderParams<Params>>
            ) => Promise<ResourceState>;
            method?: never;
            stream?: never;
          }
        | {
            /**
             * Used to generate a method in the store, when called will trigger the resource loader/stream.
             */
            method: (args: ParamsArgs) => Params;
            loader: (
              param: NoInfer<ResourceLoaderParams<Params>>
            ) => Promise<ResourceState>;
            params?: never;
            stream?: never;
          }
        | {
            method?: never;
            loader?: never;
            params?: () => Params;
            /**
             * Loading function which returns a `Promise` of a signal of the resource's value for a given
             * request, which can change over time as new values are received from a stream.
             */
            stream: ResourceStreamingLoader<ResourceState, Params>;
          }
        | {
            method: (args: ParamsArgs) => Params;
            loader?: never;
            params?: never;
            /**
             * Loading function which returns a `Promise` of a signal of the resource's value for a given
             * request, which can change over time as new values are received from a stream.
             */
            stream: ResourceStreamingLoader<ResourceState, Params>;
          }
      );
