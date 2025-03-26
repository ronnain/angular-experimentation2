import { EntityWithStatus, IdSelector } from './storev2';

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
export function removedEntities<
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
export function updateEntities<
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
