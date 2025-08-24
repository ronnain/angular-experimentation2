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
import { isEqual } from '../cached-query/util';

export function localStoragePersister(prefix: string): QueriesPersister {
  const _injector = inject(Injector);
  const queriesMap = signal(
    new Map<
      string,
      {
        queryResource: ResourceRef<any>;
        queryResourceParamsSrc: Signal<unknown>;
        storageKey: string;
        waitForParamsSrcToBeEqualToPreviousValue: boolean;
      }
    >(),
    { equal: () => false }
  );

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
      const data = untracked(() => queriesMap().get(newKey));
      nestedEffect(_injector, () => {
        if (!data) {
          return;
        }
        const { queryResource, queryResourceParamsSrc, storageKey } = data;
        const queryStatus = queryResource.status();
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

      if (data?.waitForParamsSrcToBeEqualToPreviousValue) {
        const waitForParamsSrcToBeEqualToPreviousValueEffect = nestedEffect(
          _injector,
          () => {
            const { queryResourceParamsSrc, storageKey, queryResource } = data;
            const params = queryResourceParamsSrc();
            if (params === undefined) {
              return;
            }
            const storedValue = localStorage.getItem(storageKey);
            if (!storedValue) {
              waitForParamsSrcToBeEqualToPreviousValueEffect.destroy();
              return;
            }
            try {
              const { queryValue, queryParams } = JSON.parse(storedValue);
              const isEqualParams = isEqual(params, queryParams);
              if (!isEqualParams) {
                localStorage.removeItem(storageKey);
                waitForParamsSrcToBeEqualToPreviousValueEffect.destroy();
                return;
              }
              if (isEqualParams) {
                queryResource.set(queryValue);
              }
              waitForParamsSrcToBeEqualToPreviousValueEffect.destroy();
            } catch (e) {
              console.error('Error parsing stored value from localStorage', e);
              waitForParamsSrcToBeEqualToPreviousValueEffect.destroy();
              return;
            }
          }
        );
      }
    });
  });

  return {
    addQueryToPersist(data: {
      key: string;
      queryResource: ResourceRef<any>;
      queryResourceParamsSrc: Signal<unknown>;
      waitForParamsSrcToBeEqualToPreviousValue: boolean;
    }): void {
      const {
        key,
        queryResource,
        queryResourceParamsSrc,
        waitForParamsSrcToBeEqualToPreviousValue,
      } = data;
      const storageKey = `${prefix}${key}`;
      const storedValue = localStorage.getItem(storageKey);
      if (storedValue && !waitForParamsSrcToBeEqualToPreviousValue) {
        const { queryValue } = JSON.parse(storedValue);
        queryResource.set(queryValue);
      }
      queriesMap.update((map) => {
        map.set(key, {
          queryResource,
          queryResourceParamsSrc,
          storageKey,
          waitForParamsSrcToBeEqualToPreviousValue,
        });
        return map;
      });
    },

    clearQuery(queryKey: string): void {
      queriesMap.update((map) => {
        map.delete(queryKey);
        localStorage.removeItem(`${prefix}${queryKey}`);
        return map;
      });
    },

    clearAllQueries(): void {
      queriesMap().forEach((_, key) => {
        localStorage.removeItem(`${prefix}${key}`);
      });
      queriesMap.update((map) => {
        map.clear();
        return map;
      });
    },
  };
}
