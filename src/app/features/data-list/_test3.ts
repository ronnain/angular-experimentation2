import { Observable } from 'rxjs';

type AnyFunc = (...arg: any) => any;

type LastFnReturnType<F extends Array<AnyFunc>, Else = never> = F extends [
  ...any[],
  (...arg: any) => infer R
]
  ? R
  : Else;

type PipeArgs<F extends AnyFunc[], Acc extends AnyFunc[] = []> = F extends [
  (...args: infer A) => infer B
]
  ? [...Acc, (...args: A) => B]
  : F extends [(...args: infer A) => any, ...infer Tail]
  ? Tail extends [(arg: infer B) => any, ...any[]]
    ? PipeArgs<Tail, [...Acc, (...args: A) => B]>
    : Acc
  : Acc;

function pipe<FirstFn extends AnyFunc, F extends AnyFunc[]>(
  arg: Parameters<FirstFn>[0],
  firstFn: FirstFn,
  ...fns: PipeArgs<F> extends F ? F : PipeArgs<F>
): LastFnReturnType<F, ReturnType<FirstFn>> {
  return (fns as AnyFunc[]).reduce((acc, fn) => fn(acc), firstFn(arg));
}

const test = pipe(
  { page: 1, pageSize: 3 },
  (srcContext) => new Observable<{ page: 1 }>(),
  (srcContext) => new Observable<{ id: string; name: string }>()
);

// const valid = pipe(
//   "1",
//   (a: string) => Number(a),
//   (c: number) => c + 1,
//   (d: number) => `${d}`,
//   (e: string) => Number(e)
// );

// const invalid = pipe(
//   "1",
//   (a: string) => Number(a),
//   (c: number) => "c + 1",
//   (d: number) => `${d}`,
//   (e: string) => Number(e)
// );
