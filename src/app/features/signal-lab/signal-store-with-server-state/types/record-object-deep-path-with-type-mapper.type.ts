import { Prettify } from '../../../../util/types/prettify';
import { MakeOptionalPropertiesRequired } from './util.type';

/**
 * Does not work with number/symbole keys
 * Does not go into arrays
 * Does not handle optional path
 */
export type RecordObjectDeepPathWithType<
  State extends object,
  WorkingState
> = Prettify<
  GetAllStatePath<MakeOptionalPropertiesRequired<State>, WorkingState>
>;

type GetAllStatePath<State extends object, WorkingState> = UnionToTuple<
  keyof State
> extends string[]
  ? __ObjectDeepPath<UnionToTuple<keyof State>, State, WorkingState>
  : never;

type DefaultObject = {};

// return an union type of all the paths in the state
type __ObjectDeepPath<
  keys extends string[],
  State,
  WorkingState,
  Acc extends {} = DefaultObject,
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
                WorkingState,
                __ObjectDeepPath<
                  UnionToTuple<keyof State[Head]>,
                  MakeOptionalPropertiesRequired<State[Head]>,
                  WorkingState,
                  MergeObject<
                    Acc,
                    {
                      [key in `${RootPath}${Head & string}`]: NonNullable<
                        State[Head]
                      > extends NonNullable<WorkingState>
                        ? boolean | ((data: WorkingState) => State[Head])
                        : (data: WorkingState) => State[Head];
                    }
                  >,
                  `${RootPath}${Head & string}.`
                >,
                RootPath
              >
            : __ObjectDeepPath<
                UnionToTuple<keyof State[Head]>,
                State[Head],
                WorkingState,
                MergeObject<
                  Acc,
                  {
                    [key in `${RootPath}${Head & string}`]: NonNullable<
                      State[Head]
                    > extends NonNullable<WorkingState>
                      ? boolean | ((data: WorkingState) => State[Head])
                      : (data: WorkingState) => State[Head];
                  }
                >,
                `${RootPath}${Head & string}.`
              >
          : Acc
        : Acc
      : Tail extends string[]
      ? __ObjectDeepPath<
          Tail,
          State,
          WorkingState,
          MergeObject<
            Acc,
            {
              [key in `${RootPath}${Head & string}`]: NonNullable<
                State[Head]
              > extends NonNullable<WorkingState>
                ? boolean | ((data: WorkingState) => State[Head])
                : (data: WorkingState) => State[Head];
            }
          >,
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

type MergeObject<A, B> = A & B;

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
