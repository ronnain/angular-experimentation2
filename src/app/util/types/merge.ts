// https://github.com/ecyrbe/zodios/blob/main/src/utils.types.ts
/**
 * Merge two types into a single type
 * @param T - first type
 * @param U - second type
 */
export type Merge<T, U> = Simplify<T & U>;

/**
 * Simplify a type by merging intersections if possible
 * @param T - type to simplify
 */
type Simplify<T> = T extends unknown ? { [K in keyof T]: T[K] } : T;
