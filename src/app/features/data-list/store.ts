import { InjectionToken } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Observable,
  switchMap,
  share,
  mergeMap,
  map,
  scan,
  groupBy,
  concatMap,
  filter,
  take,
  of,
  merge,
  startWith,
  OperatorFunction,
  tap,
} from 'rxjs';
import { statedStream } from '../../util/stated-stream/stated-stream';

export type Operator = <T, R>(
  fn: (value: T) => Observable<R>
) => OperatorFunction<T, R>;

type StatedCreation = {
  isCreating: boolean;
  isCreated: boolean;
  hasCreationError: boolean;
  creationError: any;
};

type StatedUpdate = {
  isUpdating: boolean;
  isUpdated: boolean;
  hasUpdateError: boolean;
  updateError: any;
};

type StatedDelete = {
  isDeleting: boolean;
  isDeleted: boolean;
  hasDeleteError: boolean;
  deleteError: any;
};

type StatedItem<TData> = {
  item: TData;
} & StatedCreation &
  StatedUpdate &
  StatedDelete;

type CreationStatus = {
  hasCreatingItem: boolean;
  hasCreatedItem: boolean;
  hasCreationError: boolean;
  creationError: any[];
};

type UpdateStatus = {
  hasUpdatingItem: boolean;
  hasUpdatedItem: boolean;
  hasUpdateError: boolean;
  updateError: any[];
};

type DeletionStatus = {
  hasDeletingItem: boolean;
  hasDeletedItem: boolean;
  hasDeleteError: boolean;
  deleteError: any[];
};
type ItemsStatus<TData> = {
  items: StatedItem<TData>[];
  isLoading: boolean;
  isLoaded: boolean;
  hasError: boolean;
  error: unknown;
};

type StatedItems<TData> = ItemsStatus<TData> &
  CreationStatus &
  UpdateStatus &
  DeletionStatus;

// todo pass the events to the src
// todo when to reset the createItem$.... ?
// todo add selectors ?
export const Store = new InjectionToken('Store', {
  providedIn: 'root',
  factory: () => {
    // todo replace unknwon with the correct type
    return <
      ID extends { id: string | number | symbol },
      TData extends ID,
      Created extends TData,
      Updated extends TData,
      Deleted extends TData
    >(data: {
      getAll: {
        src: Observable<unknown>;
        api: () => Observable<TData[]>;
        initialData: TData[] | undefined;
      };
      create: {
        // est-ce qu'il faut ajouter l'item ajouté à la lsite ?
        src: () => Observable<TData>;
        api: (item: TData) => Observable<Created>;
        // reducer: {
        //   // ! pu un TData mais un statedTData
        //   onCreating: (
        //     createItem: LoadingStateData<TData>,
        //     items: TData[]
        //   ) => TData[];
        //   onCreated: (
        //     createdItem: LoadedState<Created>,
        //     items: TData[]
        //   ) => TData[];
        //   onError: (
        //     createItemError: ErrorState<Created>,
        //     items: TData[]
        //   ) => TData[];
        // };
      };
      delete: {
        // todo voir comment on gère les erreurs
        src: () => Observable<TData>;
        api: (id: TData) => Observable<Deleted>;
        duration?: (events: any) => Observable<unknown>; // if not provided, the item is not removed, otherwise it is removed after the duration emit
      };
      update: {
        src: () => Observable<TData>;
        api: (item: TData) => Observable<Updated>;
        operator: Operator;
      };
    }) => {
      const itemsData$ = data.getAll.src.pipe(
        switchMap(() =>
          statedStream(data.getAll.api(), data.getAll.initialData)
        ),
        share()
      );

      // todo create a fakeId to be able to insert the item in the list
      const createItem$ = data.create.src().pipe(
        mergeMap((item) =>
          statedStream(data.create.api(item), item).pipe(
            map((createItemState) => ({
              [item.id]: {
                item: createItemState.result ?? item,
                isCreated: createItemState.isLoaded,
                hasCreationError: createItemState.hasError,
                creationError: createItemState.error,
                isCreating: createItemState.isLoading,
              } satisfies StatedCreation & { item: TData },
            }))
          )
        ),
        scan((acc, curr) => {
          const createItem = {
            ...acc.createItem,
            ...curr,
          };
          return {
            type: 'create' as const,
            isCreating: Object.values(createItem).some(
              ({ isCreating }) => isCreating
            ),
            isCreated: Object.values(createItem).every(
              ({ isCreated }) => isCreated
            ), //! createItem with error are not considered loaded, maybe change to complete ?
            hasCreationError: Object.values(createItem).some(
              ({ hasCreationError }) => hasCreationError
            ),
            creationError: Object.values(createItem)
              .filter(({ creationError }) => creationError)
              .map(({ creationError }) => creationError), // todo improve type
            createItem,
          };
        }, {} as StatedCreation & { createItem: { [id: string | number | symbol]: StatedCreation & { item: TData } }; type: 'create' }),
        share()
      );
      // todo voir si on garde un old item et on remet si ce n'est pas valide ?
      // todo test memoryleak
      const updateItem$ = data.update.src().pipe(
        groupBy((item) => item.id),
        mergeMap((groupedItemById$) => {
          return groupedItemById$.pipe(
            data.update.operator((item) => {
              return statedStream(data.update.api(item), item).pipe(
                map((updateItemState) => ({
                  [item.id]: {
                    item: updateItemState.result ?? item,
                    isUpdated: updateItemState.isLoaded,
                    hasUpdateError: updateItemState.hasError,
                    updateError: updateItemState.error,
                    isUpdating: updateItemState.isLoading,
                  } satisfies StatedUpdate & { item: TData },
                }))
              );
            })
          );
        }),
        scan((acc, curr) => {
          console.log('curr', curr);
          debugger;
          const updateItem = {
            ...acc.updateItem,
            ...curr,
          };
          return {
            type: 'update' as const,
            isUpdated: Object.values(updateItem).some(
              ({ isUpdated }) => isUpdated
            ),
            isUpdating: Object.values(updateItem).every(
              ({ isUpdating }) => isUpdating
            ), //! createItem with error are not considered loaded, maybe change to complete ?
            hasUpdateError: Object.values(updateItem).some(
              ({ hasUpdateError }) => hasUpdateError
            ),
            updateError: Object.values(updateItem)
              .filter(({ updateError }) => updateError)
              .map(({ updateError }) => updateError), // todo improve type
            updateItem,
          };
        }, {} as StatedUpdate & { updateItem: { [id: string | number | symbol]: StatedUpdate & { item: TData } }; type: 'update' }),
        share()
      ); // todo update item ui

      const deleteItem$ = data.delete.src().pipe(
        mergeMap((item) =>
          statedStream(data.delete.api(item), item).pipe(
            // tap({
            //   next: (data) => console.log('[delete] data', data),
            //   error: (error) => console.log('[delete] error', error),
            //   complete: () => console.log('[delete] complete'),
            //   subscribe: () => console.log('[delete] subscribe'),
            //   unsubscribe: () => console.log('[delete] unsubscribe'),
            //   finalize: () => console.log('[delete] finalize'),
            // }),
            map((deleteItemState) => ({
              [item.id]: {
                item: deleteItemState.result ?? item,
                isDeleted: deleteItemState.isLoaded,
                hasDeleteError: deleteItemState.hasError,
                deleteError: deleteItemState.error,
                isDeleting: deleteItemState.isLoading,
              } satisfies StatedDelete & {
                item: TData;
              },
            }))
          )
        ),
        scan((acc, curr) => {
          const deleteItem = {
            ...acc.deleteItem,
            ...curr,
          };
          return {
            type: 'delete' as const,
            hasDeletingItem: Object.values(deleteItem).some(
              ({ isDeleting }) => isDeleting
            ),
            hasDeletedItem: Object.values(deleteItem).some(
              ({ isDeleted }) => isDeleted
            ), //! createItem with error are not considered loaded, maybe change to complete ?
            hasDeleteError: Object.values(deleteItem).some(
              ({ hasDeleteError }) => hasDeleteError
            ),
            deleteError: Object.values(deleteItem)
              .filter(({ hasDeleteError }) => hasDeleteError)
              .map(({ deleteError }) => deleteError), // todo improve type
            deleteItem,
          };
        }, {} as DeletionStatus & { deleteItem: { [id: string | number | symbol]: StatedDelete & { item: TData } }; type: 'delete' }),
        share()
      ); // todo update item ui

      const events = undefined;
      const filterDeletedItems$ = deleteItem$.pipe(
        filter(({ hasDeletedItem }) => hasDeletedItem),
        switchMap((deleteData) => {
          const deletedItemIds = Object.values(deleteData.deleteItem)
            .filter(({ isDeleted }) => isDeleted)
            .map(({ item }) => item.id);
          return (
            data.delete.duration?.(events).pipe(
              take(1),
              map(() => deletedItemIds)
            ) ?? of([])
          );
        }),
        map((deletedItemIds) => ({
          type: 'filterDeletedItems' as const,
          deletedItemIds,
        }))
      );

      // todo create event subject, and subscribe to the source and emit the event from the subscript from here
      // const events$ = {
      //   // todo add itemProcessing and itemProcessed
      //   itemsLoading: itemsData$.pipe(filter((state) => state.isLoading)),
      //   itemsLoaded: itemsData$.pipe(filter((state) => state.isLoaded)),
      //   itemsError: itemsData$.pipe(filter((state) => state.hasError)),
      //   itemCreation: createItem$.pipe(filter((state) => state.isLoading)),
      //   itemCreated: createItem$.pipe(filter((state) => state.isLoaded)),
      //   itemCreatedError: createItem$.pipe(filter((state) => state.hasError)),
      //   itemUpdating: updateItem$.pipe(filter((state) => state.isLoading)),
      //   itemUpdated: updateItem$.pipe(filter((state) => state.isLoaded)),
      //   itemUpdatedError: updateItem$.pipe(filter((state) => state.hasError)),
      //   itemDeleting: deleteItem$.pipe(filter((state) => state.isLoading)),
      //   itemDeleted: deleteItem$.pipe(filter((state) => state.isLoaded)),
      //   itemDeletedError: deleteItem$.pipe(filter((state) => state.hasError)),
      //   itemProcessing: merge(
      //     // todo check if we need to skipUntil isProcessing
      //     createItem$.pipe(
      //       map(({ isLoading }) => ({ isLoading, type: 'create' }))
      //     ),
      //     updateItem$.pipe(
      //       map(({ isLoading }) => ({ isLoading, type: 'update' }))
      //     ),
      //     deleteItem$.pipe(
      //       map(({ isLoading }) => ({ isLoading, type: 'delete' }))
      //     )
      //   ).pipe(
      //     scan(
      //       (acc, curr) => {
      //         const processingType = {
      //           ...acc.processingType,
      //           [curr.type]: curr.isLoading,
      //         };
      //         return {
      //           isProcessing: Object.values(processingType).some(
      //             (isProcessing) => isProcessing
      //           ),
      //           processingType,
      //         };
      //       },
      //       { isProcessing: false, processingType: {} } as {
      //         isProcessing: boolean;
      //         processingType: { [key: string]: boolean };
      //       }
      //     )
      //   ),
      //   itemProcessed: merge(
      //     // todo check if we need to skipUntil isProcessed
      //     createItem$.pipe(
      //       map(({ isLoaded }) => ({ isLoaded, type: 'create' }))
      //     ),
      //     updateItem$.pipe(
      //       map(({ isLoaded }) => ({ isLoaded, type: 'update' }))
      //     ),
      //     deleteItem$.pipe(
      //       map(({ isLoaded }) => ({ isLoaded, type: 'delete' }))
      //     )
      //   ).pipe(
      //     scan(
      //       (acc, curr) => {
      //         const processedType = {
      //           ...acc.processedType,
      //           [curr.type]: curr.isLoaded,
      //         };
      //         return {
      //           isProcessed: Object.values(processedType).some(
      //             (isProcessed) => isProcessed
      //           ),
      //           processedType,
      //         };
      //       },
      //       { isProcessed: false, processedType: {} } as {
      //         isProcessed: boolean;
      //         processedType: { [key: string]: boolean };
      //       }
      //     )
      //   ),
      //   itemHasError: merge(
      //     // todo check if we need to skipUntil isProcessed
      //     createItem$.pipe(
      //       map(({ hasError }) => ({ hasError, type: 'create' }))
      //     ),
      //     updateItem$.pipe(
      //       map(({ hasError }) => ({ hasError, type: 'update' }))
      //     ),
      //     deleteItem$.pipe(
      //       map(({ hasError }) => ({ hasError, type: 'delete' }))
      //     )
      //   ).pipe(
      //     scan(
      //       (acc, curr) => {
      //         const processedType = {
      //           ...acc.processedType,
      //           [curr.type]: curr.hasError,
      //         };
      //         return {
      //           hasProcessError: Object.values(processedType).some(
      //             (isProcessed) => isProcessed
      //           ),
      //           processedType,
      //         };
      //       },
      //       { hasProcessError: false, processedType: {} } as {
      //         hasProcessError: boolean;
      //         processedType: { [key: string]: boolean };
      //       }
      //     )
      //   ),
      // };
      // faire en sorte d'updat allData en fonction des events, 1 récupèrre all data puis switchMap avec tous à vide
      const allData$: Observable<StatedItems<TData>> = itemsData$.pipe(
        switchMap((itemsData) => {
          const seed = {
            items:
              itemsData.result?.map(
                (item) =>
                  ({
                    item,
                    isCreating: false,
                    isCreated: false,
                    hasCreationError: false,
                    creationError: undefined,
                    isUpdating: false,
                    isUpdated: false,
                    hasUpdateError: false,
                    updateError: undefined,
                    isDeleting: false,
                    isDeleted: false,
                    hasDeleteError: false,
                    deleteError: undefined,
                  } as StatedItem<TData>)
              ) ?? [],
            isLoading: itemsData.isLoading,
            isLoaded: itemsData.isLoaded,
            hasError: itemsData.hasError,
            error: itemsData.error,
          } satisfies ItemsStatus<TData>;
          return merge(
            createItem$,
            updateItem$,
            deleteItem$,
            filterDeletedItems$
          ).pipe(
            scan((acc, curr) => {
              debugger;
              switch (curr.type) {
                case 'create': {
                  // todo avoid to mutate
                  Object.entries(curr.createItem).forEach(([id, item]) => {
                    const index = acc.items.findIndex(
                      (itemData) => itemData.item.id == id // todo improve
                    );
                    if (index === -1) {
                      // todo improve if adding on the top
                      acc.items = [...acc.items, item as StatedItem<TData>];
                    } else {
                      acc.items[index] = {
                        ...acc.items[index],
                        ...item,
                      };
                    }
                  });
                  return {
                    ...acc,
                  };
                }
                case 'update': {
                  // todo avoid to mutate
                  Object.entries(curr.updateItem).forEach(([id, item]) => {
                    const index = acc.items.findIndex(
                      (itemData) => itemData.item.id == id // todo improve
                    );
                    if (index === -1) {
                      return;
                    }
                    acc.items[index] = {
                      ...acc.items[index],
                      ...item,
                    };
                  });

                  return {
                    ...acc,
                  };
                }
                case 'delete': {
                  // todo avoid to mutate
                  Object.entries(curr.deleteItem).forEach(([id, item]) => {
                    const index = acc.items.findIndex(
                      (itemData) => itemData.item.id == id // todo improve
                    );
                    if (index === -1) {
                      return;
                    }
                    acc.items[index] = {
                      ...acc.items[index],
                      ...item,
                    };
                  });
                  return {
                    ...acc,
                  };
                }

                case 'filterDeletedItems': {
                  return {
                    ...acc,
                    items: acc.items.filter(
                      (item) => !curr.deletedItemIds.includes(item.item.id)
                    ),
                  };
                }
              }
            }, seed),
            startWith(seed),
            map((data) => {
              const items = data.items;
              return {
                ...data,
                hasCreatingItem: !!items?.some(({ isCreating }) => isCreating),
                hasCreatedItem: !!items?.every(({ isCreated }) => isCreated),
                hasCreationError: !!items?.some(
                  ({ hasCreationError }) => hasCreationError
                ),
                creationError:
                  items
                    ?.filter(({ creationError }) => creationError)
                    .map(({ creationError }) => creationError) ?? [],
                hasUpdatingItem: !!items?.some(({ isUpdating }) => isUpdating),
                hasUpdatedItem: !!items?.every(({ isUpdated }) => isUpdated),
                hasUpdateError: !!items?.some(
                  ({ hasUpdateError }) => hasUpdateError
                ),
                updateError:
                  items
                    ?.filter(({ updateError }) => updateError)
                    .map(({ updateError }) => updateError) ?? [],
                hasDeletingItem: !!items?.some(({ isDeleting }) => isDeleting),
                hasDeletedItem: !!items?.every(({ isDeleted }) => isDeleted),
                hasDeleteError: !!items?.some(
                  ({ hasDeleteError }) => hasDeleteError
                ),
                deleteError:
                  items
                    ?.filter(({ deleteError }) => deleteError)
                    .map(({ deleteError }) => deleteError) ?? [],
              } satisfies StatedItems<TData>;
            })
          );
        })
      );

      return {
        // data: toSignal(itemsData$),
        allData: toSignal(allData$),
        // events$,
      };
    };
  },
});
