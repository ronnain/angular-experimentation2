// It is not possible to get all the properties key of an optional object, so make the optional properties required
export type MakeOptionalPropertiesRequired<
  T,
  K extends keyof T = keyof T
> = T & {
  [P in K]-?: T[P];
};
