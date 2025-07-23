import { ResourceRef } from '@angular/core';

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
