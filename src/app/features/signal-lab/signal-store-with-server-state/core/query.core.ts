import { ResourceRef, Signal } from '@angular/core';
import { ReloadQueriesConfig } from '../types/shared.type';

export function triggerQueryReloadFromMutationChange<
  ResourceState extends object | undefined
>({
  reload,
  mutationStatus,
  queryResource,
  mutationResource,
  mutationParamsSrc,
}: {
  reload: ReloadQueriesConfig<any>;
  mutationStatus: string;
  queryResource: ResourceRef<ResourceState | undefined>;
  mutationResource: ResourceRef<any>;
  mutationParamsSrc: Signal<any>;
}) {
  const statusMappings = {
    onMutationError: 'error',
    onMutationResolved: 'resolved',
    onMutationLoading: 'loading',
  };

  Object.entries(reload).forEach(([reloadType, reloadConfig]) => {
    const expectedStatus =
      statusMappings[reloadType as keyof typeof statusMappings];

    if (expectedStatus && mutationStatus === expectedStatus) {
      if (typeof reloadConfig === 'function') {
        if (
          reloadConfig({
            queryResource,
            mutationResource,
            mutationParams: mutationParamsSrc() as any,
          })
        ) {
          queryResource.reload();
        }
      } else if (reloadConfig) {
        queryResource.reload();
      }
    }
  });
}
