import {
  ResourceRef,
  ResourceStatus,
  signal,
  effect,
  Signal,
  WritableSignal,
} from '@angular/core';
import { ResourceByIdRef } from '../resource-by-id';

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

type StateContextConstraints = any extends {
  stateType: any;
  actions: string;
}
  ? {
      /**
       * Your state structure (returned by reducer).
       * actionStatus will be automatically added
       */
      stateType: object;
      /**
       * All the actions you needs
       */
      actions: string;
    }
  : never;

export type ServerStateContext<StateContext extends StateContextConstraints> =
  StateContext;

// Store events
type StoreEvents<StateContext extends StateContextConstraints> = Record<
  StateContext['actions'],
  WritableSignal<ActionRef<any> | undefined>
>;

type StoreEventsReadonly<StateContext extends StateContextConstraints> =
  Prettify<Record<StateContext['actions'], Signal<ActionRef<any> | undefined>>>;

type SimpleAction<LoaderResponseValue> = ResourceRef<LoaderResponseValue>;

type GroupByAction<LoaderResponseValue> = ResourceByIdRef<
  string | number,
  LoaderResponseValue
>;

// Action
type ActionRef<LoaderResponseValue> =
  | SimpleAction<LoaderResponseValue>
  | GroupByAction<LoaderResponseValue>;

type Action<
  LoaderResponseValue,
  StateContext extends StateContextConstraints
> = {
  resourceRef: (params: {
    storeEvents: StoreEventsReadonly<StateContext>;
  }) => ActionRef<LoaderResponseValue>;
  reducer: (params: {
    actionResource: ResourceRef<LoaderResponseValue>;
    state: StateContext['stateType'];
    //  I hope the request will be exposed that will enable to pass the request with the inferred type
    // request?: any;
    groupId?: string | number; // todo only for groupBy action
  }) => StateContext['stateType'];
};

/**
 * If the action can be triggered multiples times, use the request property of the resource method
 */
export function action<StateContext extends StateContextConstraints>() {
  return <LoaderResponseValue>(
    config: Action<LoaderResponseValue, StateContext>
  ) => {
    return config;
  };
}

export function signalServerState<
  StateContext extends StateContextConstraints
>() {
  return <
    Actions extends Record<StateContext['actions'], Action<any, StateContext>>
  >(
    data: Actions,
    opts: { initialState: StateContext['stateType'] }
  ) => {
    const entries = Object.entries<Action<any, StateContext>>(data);

    // Create internal action sources
    const storeEvents = entries.reduce((acc, [actionName, action]) => {
      acc[actionName as StateContext['actions']] = signal<
        ActionRef<any> | undefined
      >(undefined);
      return acc;
    }, {} as StoreEvents<StateContext>);

    const state = signal<StateContext['stateType']>(opts.initialState);

    entries.forEach(([actionName, action]) => {
      const actionResource = action.resourceRef({ storeEvents });

      if (isResourceRef(actionResource)) {
        effect(() => {
          if (actionResource.status() === ResourceStatus.Idle) {
            // do not run the reducer when the action is invalid (idle status)
            return;
          }
          state.update((state) => action.reducer({ state, actionResource }));
        });

        effect(() => {
          if (actionResource.status() === ResourceStatus.Idle) {
            // do not emit the Idle status
            return;
          }
          const signalEvent =
            storeEvents[actionName as StateContext['actions']];
          console.log(actionName, actionResource, actionResource.status());
          signalEvent.set(actionResource);
        });
      }
      if (isResourceByIdRef(actionResource)) {
        effect(() => {
          const resourceByIdRef = actionResource();
          Object.entries(resourceByIdRef).forEach(([groupId, resourceRef]) => {
            if (resourceRef) {
              console.log(
                'resourceRef.status()',
                groupId,
                resourceRef.status(),
                resourceRef
              );

              if (resourceRef.status() !== ResourceStatus.Idle) {
                state.update((state) =>
                  action.reducer({
                    state,
                    actionResource: resourceRef,
                    groupId,
                  })
                );
              }
            }
          });
        });
      }
    });

    return {
      state: state.asReadonly(),
      signalEvents: storeEvents,
    };
  };
}

function isResourceRef<DataType>(
  action: any
): action is SimpleAction<DataType> {
  return 'hasValue' in action && typeof action.hasValue === 'function';
}

function isResourceByIdRef<DataType>(
  action: any
): action is GroupByAction<DataType> {
  return !('hasValue' in action) && !(typeof action.hasValue === 'function');
}
