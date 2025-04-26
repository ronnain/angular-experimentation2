import {
  ResourceRef,
  ResourceStatus,
  signal,
  effect,
  Signal,
  WritableSignal,
} from '@angular/core';

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

type StateContextContraints = any extends {
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

export type ServerStateContext<StateContext extends StateContextContraints> =
  StateContext;

// Store events
type StoreEvents<StateContext extends StateContextContraints> = Record<
  StateContext['actions'],
  WritableSignal<ResourceRef<any> | undefined>
>;

type StoreEventsReadonly<StateContext extends StateContextContraints> =
  Prettify<
    Record<StateContext['actions'], Signal<ResourceRef<any> | undefined>>
  >;

// Action
type Action<
  LoaderResponseValue,
  StateContext extends StateContextContraints
> = {
  resource: (params: {
    storeEvents: StoreEventsReadonly<StateContext>;
  }) => ResourceRef<LoaderResponseValue>;
  reducer: (params: {
    actionResource: ResourceRef<LoaderResponseValue>;
    state: StateContext['stateType'];
  }) => StateContext['stateType'];
};

/**
 * If the action can be triggered multiples times, use the request property of the resource method
 */
export function action<StateContext extends StateContextContraints>() {
  return <LoaderResponseValue>(
    config: Action<LoaderResponseValue, StateContext>
  ) => {
    return config;
  };
}

export function signalServerState<
  StateContext extends StateContextContraints
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
        ResourceRef<any> | undefined
      >(undefined);
      return acc;
    }, {} as StoreEvents<StateContext>);

    const state = signal<StateContext['stateType']>(opts.initialState);

    entries.forEach(([actionName, action]) => {
      const actionResource = action.resource({ storeEvents });

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
        const signalEvent = storeEvents[actionName as StateContext['actions']];
        console.log(actionName, actionResource, actionResource.status());
        signalEvent.set(actionResource);
      });
    });

    return {
      state: state.asReadonly(),
      signalEvents: storeEvents,
    };
  };
}
