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
            mutationIdentifier: QueryAndMutationRecord['mutation']['groupIdentifier'];
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
        ? OptimisticPatchQueryFn<QueryAndMutationRecord, TargetedType>
        : never;
    }
  : never;

export type OptimisticPatchQueryFn<
  QueryAndMutationRecord extends QueryAndMutationRecordConstraints,
  TargetedType
> = (
  data: MergeObjects<
    [
      {
        queryResource: NoInfer<
          ResourceRef<QueryAndMutationRecord['query']['state']>
        >;
        mutationResource: NoInfer<
          ResourceRef<QueryAndMutationRecord['mutation']['state']>
        >;
        mutationParams: NonNullable<
          NoInfer<QueryAndMutationRecord['mutation']['params']>
        >;
        targetedState: TargetedType | undefined;
      },
      QueryAndMutationRecord['query']['groupIdentifier'] extends string | number
        ? {
            queryIdentifier: QueryAndMutationRecord['query']['groupIdentifier'];
            queryResources: ResourceByIdRef<
              QueryAndMutationRecord['query']['groupIdentifier'],
              QueryAndMutationRecord['query']['state']
            >;
          }
        : {},
      QueryAndMutationRecord['mutation']['groupIdentifier'] extends
        | string
        | number
        ? {
            mutationIdentifier: QueryAndMutationRecord['mutation']['groupIdentifier'];
            mutationResources: ResourceByIdRef<
              QueryAndMutationRecord['mutation']['groupIdentifier'],
              QueryAndMutationRecord['mutation']['state']
            >;
          }
        : {}
    ]
  >
) => TargetedType;

export type FilterQueryById<
  QueryAndMutationRecord extends QueryAndMutationRecordConstraints
> = (
  data: MergeObjects<
    [
      {
        queryResource: ResourceRef<QueryAndMutationRecord['query']['state']>;
        mutationResource: ResourceRef<
          NoInfer<QueryAndMutationRecord['mutation']['state']>
        >;
        mutationParams: NonNullable<
          NoInfer<QueryAndMutationRecord['mutation']['params']>
        >;
      },
      QueryAndMutationRecord['query']['groupIdentifier'] extends string | number
        ? {
            queryIdentifier: QueryAndMutationRecord['query']['groupIdentifier'];
            queryResources: ResourceByIdRef<
              QueryAndMutationRecord['query']['groupIdentifier'],
              QueryAndMutationRecord['query']['state']
            >;
          }
        : {},
      QueryAndMutationRecord['mutation']['groupIdentifier'] extends
        | string
        | number
        ? {
            mutationIdentifier: QueryAndMutationRecord['mutation']['groupIdentifier'];
            mutationResources: ResourceByIdRef<
              QueryAndMutationRecord['mutation']['groupIdentifier'],
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
