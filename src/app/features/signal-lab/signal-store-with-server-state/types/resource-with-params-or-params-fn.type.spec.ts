import { ResourceOptions } from '@angular/core';
import { ObjectDeepPath } from './object-deep-path-mapper.type';
import { ResourceWithParamsOrParamsFn } from './resource-with-params-or-params-fn.type';
import { Equal, Expect } from '../../../../../../test-type';

function test<ResourceState, Params, ParamsArgs>(
  data: ResourceWithParamsOrParamsFn<ResourceState, Params, ParamsArgs>
) {
  return data;
}

type InferParamsType<T> = T extends ResourceWithParamsOrParamsFn<
  any,
  infer Params,
  any
>
  ? Params
  : never;

type InferParamsArgType<T> = T extends ResourceWithParamsOrParamsFn<
  any,
  any,
  infer ParamsArgs
>
  ? ParamsArgs
  : never;
it('Should accept params or paramsFn, but not both', () => {
  const paramsOnly = test({
    params: () => 'test' as const,
  });
  type ParamsOnlyTypeRRetrieved = Expect<
    Equal<InferParamsType<typeof paramsOnly>, 'test'>
  >;

  const paramsFnOnly = test({
    paramsFn: (data: { id: string; name: string; email: string }) =>
      'test' as const,
  });
  type ParamsFnOnlyTypeRRetrieved = Expect<
    Equal<InferParamsType<typeof paramsFnOnly>, 'test'>
  >;

  // ! vérifier qu'on accède bien aux args ?
  type ParamsFnOnlyArgTypeRetrieved = Expect<
    Equal<
      Parameters<NonNullable<(typeof paramsFnOnly)['paramsFn']>>[0],
      { id: string; name: string; email: string }
    >
  >;

  function testArgs<ResourceState, Params, ParamsArgs>(
    data: ResourceWithParamsOrParamsFn<ResourceState, Params, ParamsArgs>
  ) {
    return data as ParamsArgs;
  }
  const argsReturned = testArgs({
    paramsFn: (data: { id: string; name: string; email: string }) => data,
  });
  type ParamsFnOnlyArgTypeRetrieved2 = Expect<
    Equal<typeof argsReturned, { id: string; name: string; email: string }>
  >;

  //@ts-expect-error
  const noBoth = test({
    params: () => 'test' as const,
    paramsFn: () => 'test' as const,
  });
});
