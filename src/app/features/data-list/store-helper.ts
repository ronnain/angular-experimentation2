import { EntityStatus, EntityWithStatus, IdSelector } from './storev2';

export function removedEntityFrom<
  TData,
  Entity extends EntityWithStatus<TData, string>,
  Entities extends EntityWithStatus<TData, string>[]
>(
  {
    entities,
    entityIdSelector,
    entityWithStatus,
    outOfContextEntities,
  }: {
    entityWithStatus: Entity;
    entities: Entities;
    outOfContextEntities: Entities;
    entityIdSelector: IdSelector<TData>;
  },
  {
    from,
  }: {
    from: 'entities' | 'outOfContextEntities';
  }
) {
  return {
    entities:
      from === 'entities'
        ? entities.filter((entityWithStatusData) => {
            return (
              entityIdSelector(entityWithStatusData.entity) !==
              entityIdSelector(entityWithStatus.entity)
            );
          })
        : entities,
    outOfContextEntities:
      from === 'outOfContextEntities'
        ? outOfContextEntities.filter((entityWithStatusData) => {
            return (
              entityIdSelector(entityWithStatusData.entity) !==
              entityIdSelector(entityWithStatus.entity)
            );
          })
        : outOfContextEntities,
  };
}

export function removedEntity<
  TData,
  Entity extends EntityWithStatus<TData, string>,
  Entities extends EntityWithStatus<TData, string>[]
>({
  entities,
  entityIdSelector,
  entityWithStatus,
  outOfContextEntities,
}: {
  entityWithStatus: Entity;
  entities: Entities;
  outOfContextEntities: Entities;
  entityIdSelector: IdSelector<TData>;
}) {
  return {
    entities: entities.filter((entityWithStatusData) => {
      return (
        entityIdSelector(entityWithStatusData.entity) !==
        entityIdSelector(entityWithStatus.entity)
      );
    }),
    outOfContextEntities: outOfContextEntities.filter(
      (entityWithStatusData) => {
        return (
          entityIdSelector(entityWithStatusData.entity) !==
          entityIdSelector(entityWithStatus.entity)
        );
      }
    ),
  };
}

export function updateEntity<
  TData,
  Entity extends EntityWithStatus<TData, string>,
  Entities extends EntityWithStatus<TData, string>[]
>(
  {
    entities,
    entityIdSelector,
    entityWithStatus,
    outOfContextEntities,
  }: {
    entityWithStatus: Entity;
    entities: Entities;
    outOfContextEntities: Entities;
    entityIdSelector: IdSelector<TData>;
  },
  callBack: (entityWithStatus: Entity) => Entity
) {
  return {
    entities: entities.map((entityWithStatusData) => {
      if (
        entityIdSelector(entityWithStatusData.entity) ===
        entityIdSelector(entityWithStatus.entity)
      ) {
        return callBack(entityWithStatus);
      }
      return entityWithStatusData;
    }),
    outOfContextEntities: outOfContextEntities.map((entityWithStatusData) => {
      if (
        entityIdSelector(entityWithStatusData.entity) ===
        entityIdSelector(entityWithStatus.entity)
      ) {
        return callBack(entityWithStatus);
      }
      return entityWithStatusData;
    }),
  };
}

// add or replace entity in entities or outOfContextEntities and filter out the entity from the other one
export function addOrReplaceEntityIn<
  TData,
  Entity extends EntityWithStatus<TData, string>,
  Entities extends EntityWithStatus<TData, string>[]
>(
  {
    entities,
    entityIdSelector,
    entityWithStatus,
    outOfContextEntities,
  }: {
    entityWithStatus: Entity;
    entities: Entities;
    outOfContextEntities: Entities;
    entityIdSelector: IdSelector<TData>;
  },
  {
    target,
    strategy = 'unshift',
  }: {
    target: 'entities' | 'outOfContextEntities';
    strategy?: 'push' | 'unshift';
  }
) {
  const targetEntities =
    target === 'entities' ? entities : outOfContextEntities;
  const addEntityToTargetEntities =
    strategy === 'push'
      ? [...targetEntities, entityWithStatus]
      : [entityWithStatus, ...targetEntities];
  return {
    entities:
      target !== 'entities'
        ? entities.filter((entityWithStatusData) => {
            return (
              entityIdSelector(entityWithStatusData.entity) !==
              entityIdSelector(entityWithStatus.entity)
            );
          })
        : addEntityToTargetEntities,
    outOfContextEntities:
      target === 'outOfContextEntities'
        ? outOfContextEntities.filter((entityWithStatusData) => {
            return (
              entityIdSelector(entityWithStatusData.entity) !==
              entityIdSelector(entityWithStatus.entity)
            );
          })
        : addEntityToTargetEntities,
  };
}

/// bulk
export function removedBulkEntities<
  TData,
  Entities extends EntityWithStatus<TData, string>[]
>({
  entities,
  entityIdSelector,
  bulkEntities,
  outOfContextEntities,
}: {
  bulkEntities: Entities;
  entities: Entities;
  outOfContextEntities: Entities;
  entityIdSelector: IdSelector<TData>;
}) {
  return {
    entities: entities.filter((entityWithStatusData) => {
      return !bulkEntities.some(
        (bulkEntity) =>
          entityIdSelector(bulkEntity.entity) ===
          entityIdSelector(entityWithStatusData.entity)
      );
    }),
    outOfContextEntities: outOfContextEntities.filter(
      (entityWithStatusData) => {
        return !bulkEntities.some(
          (bulkEntity) =>
            entityIdSelector(bulkEntity.entity) ===
            entityIdSelector(entityWithStatusData.entity)
        );
      }
    ),
  };
}

//! the callback function can add more status methods than the existing one
export function updateBulkEntities<
  TData,
  TActionKeys extends keyof TEntityWithStatus['status'] extends string
    ? keyof TEntityWithStatus['status']
    : never,
  TEntityWithStatus extends EntityWithStatus<TData, TActionKeys>,
  TCallBack extends (
    entityWithStatus: TEntityWithStatus
  ) => EntityWithStatus<TData, TActionKeys>
>(
  {
    bulkEntities,
    entities,
    entityIdSelector,
    outOfContextEntities,
  }: {
    bulkEntities: TEntityWithStatus[];
    entities: TEntityWithStatus[];
    outOfContextEntities: TEntityWithStatus[];
    entityIdSelector: IdSelector<TData>;
  },
  callBack: TCallBack
) {
  //   return {} as Context;
  return {
    entities: entities.map((entityWithStatusData) => {
      const targetEntity = bulkEntities.find((bulkEntity) => {
        return (
          entityIdSelector(bulkEntity.entity) ===
          entityIdSelector(entityWithStatusData.entity)
        );
      });
      if (targetEntity) {
        return callBack(targetEntity);
      }
      return entityWithStatusData;
    }),
    outOfContextEntities: outOfContextEntities.map((entityWithStatusData) => {
      const targetEntity = bulkEntities.find((bulkEntity) => {
        return (
          entityIdSelector(bulkEntity.entity) ===
          entityIdSelector(entityWithStatusData.entity)
        );
      });
      if (targetEntity) {
        return callBack(targetEntity);
      }
      return entityWithStatusData;
    }),
  };
}

export function hasProcessingItem<
  TData,
  TEntityWithStatus extends EntityWithStatus<TData, string>
>(entity: TEntityWithStatus): boolean {
  return Object.values(entity.status).some(
    (entityStatus) => entityStatus?.isLoading
  );
}

export function totalProcessingItems<
  TData,
  TEntityWithStatus extends EntityWithStatus<TData, string>
>(entities: TEntityWithStatus[]): number {
  return entities.reduce(
    (acc, entity) =>
      acc +
      Object.values(entity.status).filter(
        (entityStatus) => entityStatus?.isLoading
      ).length,
    0
  );
}

export function countEntitiesWithStatusByAction<
  TData,
  TActionKeys extends keyof TEntityWithStatus['status'] extends string
    ? keyof TEntityWithStatus['status']
    : never,
  TEntityWithStatus extends EntityWithStatus<TData, TActionKeys>
>({
  entities,
  actionName,
  state,
}: {
  entities: TEntityWithStatus[];
  actionName: TActionKeys;
  state: keyof EntityStatus;
}): number {
  return entities.reduce(
    (acc, entity) => acc + (entity.status[actionName]?.[state] ? 1 : 0),
    0
  );
}

export function extractAllErrors<T extends Record<string, EntityStatus>>(
  status: T
): Array<{ status: string; message: string }> {
  return Object.entries(status)
    .filter(([, entityStatus]) => entityStatus?.hasError)
    .map(([statusKey, statusWithError]) => {
      return {
        status: statusKey,
        message: statusWithError.error?.message || 'Unknown error',
      };
    });
}

/**
 * Checks if any status in the entity has errors
 */
export function hasStatus<T extends Record<string, EntityStatus>>({
  status,
}: {
  status: T;
  state: keyof EntityStatus;
}): boolean {
  return Object.values(status).some((entityStatus) => entityStatus?.hasError);
}

/**
 * Checks if any status in the entity is loading
 */
export function isStatusProcessing<T extends Record<string, EntityStatus>>(
  status: T
): boolean {
  return Object.values(status).some((entityStatus) => entityStatus?.isLoading);
}
