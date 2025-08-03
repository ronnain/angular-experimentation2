import { Equal, Expect } from '../../../../../../test-type';
import { ResourceStreamItem, signal } from '@angular/core';
import { Prettify } from '../../../../util/types/prettify';
import { RxResourceWithParamsOrParamsFn } from './rx-resource-with-params-or-params-fn.type';
import { of } from 'rxjs';

function test<ResourceState, Params, ParamsArgs>(
  data: RxResourceWithParamsOrParamsFn<ResourceState, Params, ParamsArgs>
) {
  return data;
}

type InferParamsType<T> = T extends RxResourceWithParamsOrParamsFn<
  any,
  infer Params,
  any
>
  ? Params
  : never;

type InferParamsArgType<T> = T extends RxResourceWithParamsOrParamsFn<
  any,
  any,
  infer ParamsArgs
>
  ? ParamsArgs
  : never;

type InferStateType<T> = T extends RxResourceWithParamsOrParamsFn<
  infer ResourceState,
  any,
  infer ParamsArgs
>
  ? ResourceState
  : never;

it('Should accept params or paramsFn, but not both', () => {
  const paramsOnly = test({
    params: () => 'test' as const,
    stream: ({ params }) => {
      type ExpectParamsTypeToBeRetrieved = Expect<Equal<typeof params, 'test'>>;
      return of({
        id: params,
        name: 'John Doe',
        email: 'john.doe@example.com',
      });
    },
  });
  type ParamsOnlyTypeRetrieved = Expect<
    Equal<InferParamsType<typeof paramsOnly>, 'test'>
  >;

  const paramsWithStream = test({
    params: () => 'test',
    stream: ({ params }) => {
      return of({
        id: params,
        name: 'John Doe',
        email: 'john.doe@example.com',
      });
    },
  });
  type ResourceStateTypeRetrieved = Expect<
    Equal<
      InferStateType<typeof paramsWithStream>,
      {
        id: string;
        name: string;
        email: string;
      }
    >
  >;

  const paramsFnOnly = test({
    method: (data: { id: string; name: string; email: string }) =>
      'John' as const,
    stream: ({ params }) => {
      return of({
        id: params,
        name: 'John Doe',
        email: 'john.doe@example.com',
      });
    },
  });
  type MethodOnlyTypeRetrieved = Expect<
    Equal<InferParamsType<typeof paramsFnOnly>, 'John'>
  >;

  type ParamsFnOnlyArgTypeRetrieved = Expect<
    Equal<
      Parameters<NonNullable<(typeof paramsFnOnly)['method']>>[0],
      { id: string; name: string; email: string }
    >
  >;

  function testArgs<ResourceState, Params, ParamsArgs>(
    data: RxResourceWithParamsOrParamsFn<ResourceState, Params, ParamsArgs>
  ) {
    return data as ParamsArgs;
  }
  const argsReturned = testArgs({
    method: (data: { id: string; name: string; email: string }) => data,
    stream: ({ params }) => {
      return of({
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
