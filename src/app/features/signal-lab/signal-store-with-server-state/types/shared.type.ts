import { ResourceRef } from '@angular/core';
import { ObjectDeepPath } from './object-deep-path-mapper.type';
import {
  AccessTypeObjectPropertyByDottedPath,
  DottedPathPathToTuple,
} from './access-type-object-property-by-dotted-path.type';
import { InternalType } from './util.type';

// todo rename, and rename server state constraints
export type TypeResourceConstraints = {
  query: InternalType<unknown, unknown, unknown>;
  mutation: InternalType<unknown, unknown, unknown>;
};

export type CustomReloadOnSpecificMutationStatus<
  ServerState extends TypeResourceConstraints
> = (data: {
  queryResource: ResourceRef<ServerState['query']['state']>;
  mutationResource: ResourceRef<ServerState['mutation']['state']>;
  mutationParams: NonNullable<ServerState['query']['params']>;
}) => boolean;

export type ReloadQueriesConfig<ServerState extends TypeResourceConstraints> =
  | false
  | {
      onMutationError?:
        | boolean
        | CustomReloadOnSpecificMutationStatus<ServerState>;
      onMutationResolved?:
        | boolean
        | CustomReloadOnSpecificMutationStatus<ServerState>;
      onMutationLoading?:
        | boolean
        | CustomReloadOnSpecificMutationStatus<ServerState>;
    };

export type OptimisticPathMutationQuery<
  ServerState extends TypeResourceConstraints
> = ServerState['query']['state'] extends object
  ? {
      [queryPatchPath in ObjectDeepPath<
        ServerState['query']['state']
      >]?: AccessTypeObjectPropertyByDottedPath<
        ServerState['query']['state'],
        DottedPathPathToTuple<queryPatchPath>
      > extends infer TargetedType
        ? OptimisticPatchQueryFn<
            ServerState['query']['state'],
            ServerState['mutation']['state'],
            ServerState['mutation']['params'],
            ServerState['mutation']['args'],
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
