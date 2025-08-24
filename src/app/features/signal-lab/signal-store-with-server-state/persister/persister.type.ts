import { ResourceRef, Signal } from '@angular/core';

export interface PersistedQuery {
  key: string;
  queryResource: ResourceRef<any>;
  queryResourceParamsSrc: Signal<unknown>;
  waitForParamsSrcToBeEqualToPreviousValue: boolean;
  cacheTime: number;
}

export interface QueriesPersister {
  addQueryToPersist(data: PersistedQuery): void;

  clearQuery(queryKey: string): void;
  clearAllQueries(): void;
}
