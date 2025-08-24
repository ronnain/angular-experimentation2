import {
  effect,
  inject,
  Injector,
  linkedSignal,
  ResourceRef,
  signal,
  Signal,
  untracked,
} from '@angular/core';
import { QueriesPersister } from './persister.type';
import { nestedEffect } from '../types/util';

export function localStoragePersister(
  prefix: string = 'query-'
): QueriesPersister {
  const _injector = inject(Injector);
  const queriesMap = signal(
    new Map<
      string,
      {
        queryResource: ResourceRef<any>;
        queryResourceParamsSrc: Signal<unknown>;
        storageKey: string;
      }
    >(),
    { equal: () => false }
  ); // todo check if equal is needed here

  const newQueryKeysForNestedEffect = linkedSignal<
    any,
    { newKeys: string[] } | undefined
  >({
    source: queriesMap,
    computation: (currentSource, previous) => {
      if (!currentSource || !Array.from(currentSource.keys()).length) {
        return undefined;
      }

      const currentKeys = Array.from(currentSource.keys());
      const previousKeys = Array.from(previous?.source?.keys() || []);
      // Find keys that exist in current but not in previous
      const newKeys = currentKeys.filter(
        (key) => !previousKeys.includes(key)
      ) as string[];
      return newKeys.length > 0 ? { newKeys } : previous?.value;
    },
  });

  effect(() => {
    if (!newQueryKeysForNestedEffect()?.newKeys) {
      return;
    }

    newQueryKeysForNestedEffect()?.newKeys.forEach((newKey) => {
      nestedEffect(_injector, () => {
        const data = untracked(() => queriesMap().get(newKey));

        if (!data) {
          return;
        }
        const { queryResource, queryResourceParamsSrc, storageKey } = data;
        const queryStatus = queryResource.status();
        console.log('queryStatus', queryStatus);
        if (queryStatus !== 'resolved') {
          return;
        }
        untracked(() => {
          const queryParams = queryResourceParamsSrc();
          localStorage.setItem(
            storageKey,
            JSON.stringify({ queryParams, queryValue: queryResource.value() })
          );
        });
      });
    });
  });

  return {
    addQueryToPersist(data: {
      key: string;
      queryResource: ResourceRef<any>;
      queryResourceParamsSrc: Signal<unknown>;
    }): void {
      const { key, queryResource, queryResourceParamsSrc } = data;
      // todo place in dedicated function
      const storageKey = `${prefix}${key}`;
      const storedValue = localStorage.getItem(storageKey);
      if (storedValue) {
        const { queryValue } = JSON.parse(storedValue);
        queryResource.set(queryValue);
      }
      queriesMap.update((map) => {
        map.set(key, {
          queryResource,
          queryResourceParamsSrc,
          storageKey,
        });
        return map;
      });
    },

    clearQuery(queryKey: string): void {
      queriesMap.update((map) => {
        map.delete(queryKey);
        return map;
      });
    },

    clearAllQueries(): void {
      queriesMap.update((map) => {
        map.clear();
        return map;
      });
    },
  };
}
