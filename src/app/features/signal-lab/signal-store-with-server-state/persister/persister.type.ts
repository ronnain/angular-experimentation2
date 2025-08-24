import { ResourceRef, Signal } from '@angular/core';

export interface QueriesPersister {
  addQueryToPersist(data: {
    key: string;
    queryResource: ResourceRef<any>;
    queryResourceParamsSrc: Signal<unknown>;
    waitForParamsSrcToBeEqualToPreviousValue: boolean;
  }): void;

  clearQuery(queryKey: string): void;
  clearAllQueries(): void;
}
