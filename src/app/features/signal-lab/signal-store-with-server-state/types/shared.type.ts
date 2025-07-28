import { ResourceRef } from '@angular/core';
import { ObjectDeepPath } from './object-deep-path-mapper.type';
import {
  AccessTypeObjectPropertyByDottedPath,
  DottedPathPathToTuple,
} from './access-type-object-property-by-dotted-path.type';
import { InternalType } from './util.type';

// todo rename, and rename server state constraints
export type QueryAndMutationRecordConstraints = {
  query: InternalType<unknown, unknown, unknown, unknown>;
  mutation: InternalType<unknown, unknown, unknown, unknown>;
};

export type CustomReloadOnSpecificMutationStatus<
  QueryAndMutationRecord extends QueryAndMutationRecordConstraints
> = (data: {
  queryResource: ResourceRef<QueryAndMutationRecord['query']['state']>;
  mutationResource: ResourceRef<QueryAndMutationRecord['mutation']['state']>;
  mutationParams: NonNullable<QueryAndMutationRecord['mutation']['params']>;
}) => boolean;

export type ReloadQueriesConfig<
  QueryAndMutationRecord extends QueryAndMutationRecordConstraints
> =
  | false
  | {
      onMutationError?:
        | boolean
        | CustomReloadOnSpecificMutationStatus<QueryAndMutationRecord>;
      onMutationResolved?:
        | boolean
        | CustomReloadOnSpecificMutationStatus<QueryAndMutationRecord>;
      onMutationLoading?:
        | boolean
        | CustomReloadOnSpecificMutationStatus<QueryAndMutationRecord>;
    };

export type OptimisticPathMutationQuery<
  QueryAndMutationRecord extends QueryAndMutationRecordConstraints
> = QueryAndMutationRecord['query']['state'] extends object
  ? {
      [queryPatchPath in ObjectDeepPath<
        QueryAndMutationRecord['query']['state']
      >]?: AccessTypeObjectPropertyByDottedPath<
        QueryAndMutationRecord['query']['state'],
        DottedPathPathToTuple<queryPatchPath>
      > extends infer TargetedType
        ? OptimisticPatchQueryFn<
            QueryAndMutationRecord['query']['state'],
            QueryAndMutationRecord['mutation']['state'],
            QueryAndMutationRecord['mutation']['params'],
            QueryAndMutationRecord['mutation']['args'],
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
