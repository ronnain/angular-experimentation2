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
    loader: ({ params }) => {
      return Promise.resolve({
        id: params,
        name: 'John Doe',
        email: 'john.doe@example.com',
      });
    },
  });
  type ParamsOnlyTypeRRetrieved = Expect<
    Equal<InferParamsType<typeof paramsOnly>, 'test'>
  >;

  const paramsFnOnly = test({
    method: (data: { id: string; name: string; email: string }) =>
      'John' as const,
    loader: ({ params }) => {
      return Promise.resolve({
        id: params,
        name: 'John Doe',
        email: 'john.doe@example.com',
      });
    },
  });
  type MethodOnlyTypeRetrieved = Expect<
    Equal<InferParamsType<typeof paramsFnOnly>, 'John'>
  >;

  // ! vérifier qu'on accède bien aux args ?
  type ParamsFnOnlyArgTypeRetrieved = Expect<
    Equal<
      Parameters<NonNullable<(typeof paramsFnOnly)['method']>>[0],
      { id: string; name: string; email: string }
    >
  >;

  function testArgs<ResourceState, Params, ParamsArgs>(
    data: ResourceWithParamsOrParamsFn<ResourceState, Params, ParamsArgs>
  ) {
    return data as ParamsArgs;
  }
  const argsReturned = testArgs({
    method: (data: { id: string; name: string; email: string }) => data,
    loader: ({ params }) => {
      return Promise.resolve({
        id: params.id,
        name: params.name,
        email: params.email,
      });
    },
  });
  type ParamsFnOnlyArgTypeRetrieved2 = Expect<
    Equal<typeof argsReturned, { id: string; name: string; email: string }>
  >;

  //@ts-expect-error
  const noBoth = test({
    params: () => 'test' as const,
    method: () => 'test' as const,
  });
});
