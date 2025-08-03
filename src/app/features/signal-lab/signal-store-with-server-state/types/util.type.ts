// It is not possible to get all the properties key of an optional object, so make the optional properties required
export type MakeOptionalPropertiesRequired<
  T,
  K extends keyof T = keyof T
> = T & {
  [P in K]-?: T[P];
};

export type MergeObject<A, B> = A & B;

export type InternalType<
  State,
  Params,
  Args,
  IsGroupedResource,
  GroupIdentifier = unknown
> = {
  state: State;
  params: Params;
  args: Args;
  isGroupedResource: IsGroupedResource;
  groupIdentifier: GroupIdentifier;
};

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

export type HasChild<T> = T extends any[]
  ? false
  : T extends object
  ? true
  : false;

type OmitStrict<T, K extends keyof T> = T extends any
  ? Pick<T, Exclude<keyof T, K>>
  : never;
