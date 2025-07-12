import { ResourceLoader, ResourceOptions } from '@angular/core';

export type ResourceWithParamsOrParamsFn<ResourceState, Params, ParamsArgs> =
  | Omit<ResourceOptions<ResourceState, Params>, 'params' | 'loader'> &
      (
        | {
            /**
             * A reactive function which determines the request to be made. Whenever the request changes, the
             * loader will be triggered to fetch a new value for the resource.
             *
             * If a request function isn't provided, the loader won't rerun unless the resource is reloaded.
             */
            params: () => Params;
            loader: ResourceLoader<ResourceState, NoInfer<Params>>;
            method?: never;
          }
        | {
            /**
             * Used to generate a method in the store, when called will trigger the resource loader/stream.
             * TODO PENSER A METTRE UN EQUAL TRUE ?
             */
            // TODO RENAME method accoding to signalStore
            method: (args: ParamsArgs) => Params;
            loader: ResourceLoader<ResourceState, NoInfer<Params>>;
            params?: never;
          }
      );
