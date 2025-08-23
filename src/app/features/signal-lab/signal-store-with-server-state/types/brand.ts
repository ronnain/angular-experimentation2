export declare const __INTERNAL_QueryBrand: unique symbol;

export type HasQueryBrand<T> = typeof __INTERNAL_QueryBrand extends keyof T
  ? true
  : false;
