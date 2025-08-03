import { ResourceLoaderParams } from '@angular/core';
import { RxResourceOptions } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

export type RxResourceWithParamsOrParamsFn<ResourceState, Params, ParamsArgs> =
  | Omit<
      RxResourceOptions<NoInfer<ResourceState>, Params>,
      'params' | 'stream'
    > &
      (
        | {
            method?: never;
            loader?: never;
            params?: () => Params;
            stream: (
              params: ResourceLoaderParams<NoInfer<Params>>
            ) => Observable<ResourceState>;
          }
        | {
            method: (args: ParamsArgs) => Params;
            loader?: never;
            params?: never;
            stream: (
              params: ResourceLoaderParams<NoInfer<Params>>
            ) => Observable<ResourceState>;
          }
      );
