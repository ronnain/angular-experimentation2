export type ObjectDeepPath<State extends object> =
  | Exclude<GetAllStatePath<State>, DefaultUnion>
  | {};

type GetAllStatePath<State extends object> = UnionToTuple<
  keyof State
> extends string[]
  ? __ObjectDeepPath<UnionToTuple<keyof State>, State>
  : never;

type DefaultUnion = '__ROOT';

// return an union type of all the paths in the state
type __ObjectDeepPath<
  keys extends string[],
  State,
  Acc extends string = DefaultUnion,
  RootPath extends string = ''
> = keys extends [infer Head, ...infer Tail]
  ? Head extends keyof State
    ? HasChild<State[Head]> extends true
      ? keyof State[Head] extends string
        ? UnionToTuple<keyof State[Head]> extends string[]
          ? __ObjectDeepPath<
              UnionToTuple<keyof State[Head]>,
              State[Head],
              MergeStatePaths<Acc, `${RootPath}${Head & string}`>,
              `${RootPath}${Head & string}.`
            >
          : never
        : never
      : Tail extends string[]
      ? __ObjectDeepPath<
          Tail,
          State,
          MergeStatePaths<Acc, `${RootPath}${Head & string}`>,
          RootPath
        >
      : Acc
    : Acc
  : Acc;

// from https://github.com/ecyrbe/zodios/blob/main/src/utils.types.ts
/**
 * trick to combine multiple unions of objects into a single object
 * only works with objects not primitives
 * @param union - Union of objects
 * @returns Intersection of objects
 */
export type UnionToIntersection<union> = (
  union extends any ? (k: union) => void : never
) extends (k: infer intersection) => void
  ? intersection
  : never;

/**
 * get last element of union
 * @param Union - Union of any types
 * @returns Last element of union
 */
type GetUnionLast<Union> = UnionToIntersection<
  Union extends any ? () => Union : never
> extends () => infer Last
  ? Last
  : never;

/**
 * Convert union to tuple
 * @param Union - Union of any types, can be union of complex, composed or primitive types
 * @returns Tuple of each elements in the union
 */
export type UnionToTuple<Union, Tuple extends unknown[] = []> = [
  Union
] extends [never]
  ? Tuple
  : UnionToTuple<
      Exclude<Union, GetUnionLast<Union>>,
      [GetUnionLast<Union>, ...Tuple]
    >;

type MergeStatePaths<A, B> = A | B;

type HasChild<T> = T extends any[] ? false : T extends object ? true : false;

type OmitStrict<T, K extends keyof T> = T extends any
  ? Pick<T, Exclude<keyof T, K>>
  : never;
