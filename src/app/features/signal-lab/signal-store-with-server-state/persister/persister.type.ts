import { ResourceRef, Signal } from '@angular/core';

export interface QueriesPersister {
  addQueryToPersist(data: {
    key: string;
    queryResource: ResourceRef<any>;
    queryResourceParamsSrc: Signal<unknown>;
  }): void;

  clearQuery(queryKey: string): void;
  clearAllQueries(): void;
}
