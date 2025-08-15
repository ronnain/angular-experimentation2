import { ResourceRef } from '@angular/core';
import { ObjectDeepPath } from './object-deep-path-mapper.type';
import {
  AccessTypeObjectPropertyByDottedPath,
  DottedPathPathToTuple,
} from './access-type-object-property-by-dotted-path.type';
import { InternalType, MergeObject, MergeObjects } from './util.type';
import { ResourceByIdRef } from '../resource-by-id-signal-store';

// todo rename, and rename server state constraints
export type QueryAndMutationRecordConstraints = {
  query: InternalType<unknown, unknown, unknown, unknown>;
  mutation: InternalType<unknown, unknown, unknown, unknown>;
};

export type CustomReloadOnSpecificMutationStatus<
  QueryAndMutationRecord extends QueryAndMutationRecordConstraints
> = (
  data: MergeObjects<
    [
      {
        queryResource: ResourceRef<QueryAndMutationRecord['query']['state']>;
        mutationResource: ResourceRef<
          QueryAndMutationRecord['mutation']['state']
        >;
        mutationParams: NonNullable<
          QueryAndMutationRecord['mutation']['params']
        >;
      },
      QueryAndMutationRecord['query']['isGroupedResource'] extends true
        ? {
            queryIdentifier: QueryAndMutationRecord['query']['groupIdentifier'];
          }
        : {},
      QueryAndMutationRecord['mutation']['isGroupedResource'] extends true
        ? {
            mutationResources: ResourceByIdRef<
              string,
              QueryAndMutationRecord['mutation']['state']
            >;
          }
        : {}
    ]
  >
) => boolean;

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
> = (
  data: MergeObjects<
    [
      {
        queryResource: NoInfer<ResourceRef<QueryState>>;
        mutationResource: NoInfer<ResourceRef<MutationState>>;
        mutationParams: NonNullable<NoInfer<MutationParams>>;
        targetedState: TargetedType | undefined;
        mutationResources: never; // todo
      }
    ]
  >
) => TargetedType;

export type FilterQueryById<
  QueryAndMutationRecord extends QueryAndMutationRecordConstraints
> = (
  data: MergeObjects<
    [
      {
        queryIdentifier: QueryAndMutationRecord['query']['groupIdentifier'];
        queryResource: ResourceRef<QueryAndMutationRecord['query']['state']>;
        mutationResource: ResourceRef<
          NoInfer<QueryAndMutationRecord['mutation']['state']>
        >;
        mutationParams: NonNullable<
          NoInfer<QueryAndMutationRecord['mutation']['params']>
        >;
      },
      QueryAndMutationRecord['mutation']['isGroupedResource'] extends true
        ? {
            mutationResources: ResourceByIdRef<
              string,
              QueryAndMutationRecord['mutation']['state']
            >;
          }
        : {}
    ]
  >
) => boolean;

export type ResourceMethod<ParamsArgs, ResourceParams> = (
  args: ParamsArgs
) => ResourceParams;
