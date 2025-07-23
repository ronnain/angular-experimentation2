import { ResourceRef } from '@angular/core';
import { ObjectDeepPath } from './object-deep-path-mapper.type';
import {
  AccessTypeObjectPropertyByDottedPath,
  DottedPathPathToTuple,
} from './access-type-object-property-by-dotted-path.type';

export type CustomReloadOnSpecificMutationStatus<
  QueryState,
  MutationState,
  MutationParams,
  MutationArgsParams
> = (data: {
  queryResource: ResourceRef<QueryState>;
  mutationResource: ResourceRef<NoInfer<MutationState>>;
  mutationParams: NonNullable<NoInfer<MutationParams>>;
}) => boolean;

export type ReloadQueriesConfig<
  QueryState,
  MutationState,
  MutationParams,
  MutationArgsParams
> =
  | false
  | {
      onMutationError?:
        | boolean
        | CustomReloadOnSpecificMutationStatus<
            QueryState,
            MutationState,
            MutationParams,
            MutationArgsParams
          >;
      onMutationResolved?:
        | boolean
        | CustomReloadOnSpecificMutationStatus<
            QueryState,
            MutationState,
            MutationParams,
            MutationArgsParams
          >;
      onMutationLoading?:
        | boolean
        | CustomReloadOnSpecificMutationStatus<
            QueryState,
            MutationState,
            MutationParams,
            MutationArgsParams
          >;
    };

export type OptimisticPathMutationQuery<
  QueryState,
  MutationState,
  MutationParams,
  MutationArgsParams
> = QueryState extends object
  ? {
      [queryPatchPath in ObjectDeepPath<QueryState>]?: AccessTypeObjectPropertyByDottedPath<
        QueryState,
        DottedPathPathToTuple<queryPatchPath>
      > extends infer TargetedType
        ? OptimisticPatchQueryFn<
            QueryState,
            MutationState,
            MutationParams,
            MutationArgsParams,
            TargetedType
          >
        : never;
    }
  : never;

export type OptimisticPatchQueryFn<
  QueryState,
  MutationState,
  MutationParams,
  MutationArgsParams,
  TargetedType
> = (data: {
  queryResource: NoInfer<ResourceRef<QueryState>>;
  mutationResource: NoInfer<ResourceRef<MutationState>>;
  mutationParams: NonNullable<NoInfer<MutationParams>>;
  targetedState: TargetedType | undefined;
}) => TargetedType;
