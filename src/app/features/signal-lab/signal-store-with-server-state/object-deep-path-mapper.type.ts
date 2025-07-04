import { MakeOptionalPropertiesRequired } from './util.type';

/**
 * Does not work with number/symbole keys
 * Does not go into arrays
 * Does not handle optional path
 */
export type ObjectDeepPath<State extends object> = Exclude<
  GetAllStatePath<MakeOptionalPropertiesRequired<State>>,
  DefaultUnion
>;

type GetAllStatePath<State extends object> = UnionToTuple<
  keyof State
> extends string[]
  ? __ObjectDeepPath<UnionToTuple<keyof State>, State>
  : never;

type DefaultUnion = '__ROOT';

// todo on the continue pas dans la tail si on tombe sur un objet
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
          ? Tail extends string[]
            ? __ObjectDeepPath<
                Tail,
                MakeOptionalPropertiesRequired<State>,
                __ObjectDeepPath<
                  UnionToTuple<keyof State[Head]>,
                  MakeOptionalPropertiesRequired<State[Head]>,
                  MergeStatePaths<Acc, `${RootPath}${Head & string}`>,
                  `${RootPath}${Head & string}.`
                >,
                RootPath
              >
            : __ObjectDeepPath<
                UnionToTuple<keyof State[Head]>,
                State[Head],
                MergeStatePaths<Acc, `${RootPath}${Head & string}`>,
                `${RootPath}${Head & string}.`
              >
          : Acc
        : Acc
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
