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

type GroupByAction<
  LoaderResponseValue,
  GroupIdentifier extends string | number | undefined = undefined
> = GroupIdentifier extends string | number
  ? ResourceByIdRef<GroupIdentifier, LoaderResponseValue>
  : never;

// Action
type ActionRef<
  LoaderResponseValue,
  GroupIdentifier extends string | number | undefined = undefined
> =
  | SimpleAction<LoaderResponseValue>
  | GroupByAction<LoaderResponseValue, GroupIdentifier>;

type MergeAction<T, U> = T & U;

export type Action<
  LoaderResponseValue,
  StateContext extends StateContextConstraints,
  GroupIdentifier extends string | number | undefined
> = {
  resourceRef: (params: {
    storeEvents: StoreEventsReadonly<StateContext>;
  }) => ActionRef<LoaderResponseValue, GroupIdentifier>;
  reducer: (
    params: Prettify<
      MergeAction<
        {
          actionResource: ResourceRef<LoaderResponseValue>;
          state: StateContext['stateType'];
          //  I hope the request will be exposed that will enable to pass the request with the inferred type
          // request?: any;
        },
        GroupIdentifier extends string | number
          ? { groupId: GroupIdentifier }
          : {}
      >
    >
  ) => StateContext['stateType'];
};

/**
 * If the action can be triggered multiples times, use the request property of the resource method
 */
export function action<StateContext extends StateContextConstraints>() {
  return <
    LoaderResponseValue,
    GroupIdentifier extends string | number | undefined
  >(
    config: Action<LoaderResponseValue, StateContext, GroupIdentifier>
  ) => {
    return config;
  };
}

export function signalServerState<
  StateContext extends StateContextConstraints
>() {
  return <
    Actions extends Record<
      StateContext['actions'],
      Action<any, StateContext, any>
    >,
    const SelectorsKeys extends keyof ReturnType<SelectorsFn>,
    const SelectorsFn extends (params: {
      state: StateContext['stateType'];
    }) => Record<SelectorsKeys, unknown>,
    SelectorWrapper extends
      | {
          selectors: SelectorsFn;
        }
      | undefined
  >(
    data: Actions,
    opts: { initialState: StateContext['stateType'] },
    selectors?: SelectorWrapper
  ) => {
    const entries = Object.entries<Action<any, StateContext, any>>(data);

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
          if (actionResource.status() === 'idle') {
            // do not run the reducer when the action is invalid (idle status)
            return;
          }
          state.update((state) =>
            action.reducer({ state, actionResource, groupId: undefined })
          );
        });

        effect(() => {
          if (actionResource.status() === 'idle') {
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

              if (resourceRef.status() !== 'idle') {
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
      selectors: selectors?.selectors
        ? selectors.selectors({
            state: state(),
          })
        : undefined,
    } as unknown as Prettify<
      MergeAction<
        {
          state: Signal<Prettify<StateContext['stateType']>>;
          signalEvents: StoreEventsReadonly<StateContext>;
        },
        SelectorWrapper extends object
          ? { selectors: ReturnType<SelectorWrapper['selectors']> }
          : {}
        // : { selectors: ReturnType<SelectorsFn> }
      >
    >;
  };
}

function isResourceRef<DataType>(
  action: any
): action is SimpleAction<DataType> {
  return 'hasValue' in action && typeof action.hasValue === 'function';
}

function isResourceByIdRef<
  DataType,
  GroupIdentifier extends string | number = string
>(action: any): action is GroupByAction<DataType, GroupIdentifier> {
  return !('hasValue' in action) && !(typeof action.hasValue === 'function');
}
