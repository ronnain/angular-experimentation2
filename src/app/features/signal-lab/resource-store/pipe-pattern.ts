type StoreContext = {
  state?: unknown;
  actions?: unknown;
  events?: unknown;
  selectors?: unknown;
  methods?: Record<string, (...data: any[]) => unknown>;
};

// todo essayer d'ajouter des shadow type pour forcer l'utilisation de fonction

// ! contrainte, les fonctions précédentes ne sont pas au courant des propriétés ajouté après, d'où le patchState
// Avntage pas de double déclaration
// Obligé de créer des méthodes pour passer les config "Storecontext" au suivant, sans avoir à réécrire les types

// NonNullable is used to remove the undefined type from the Acc initial value
type Merge<A extends StoreContext, B extends StoreContext> = {
  actions: Prettify<NonNullable<A['actions'] | B['actions']>>;
  state: Prettify<A['state'] & B['state']>;
  events: Prettify<NonNullable<A['events'] | B['events']>>;
  // todo improve selectors merge to avoid never type ?
  selectors: Prettify<Prettify<A['selectors'] & B['selectors']>>;
  methods: Prettify<NonNullable<A['methods'] & B['methods']>>;
};

type MergeArgs<
  F extends StoreContext[],
  Acc extends StoreContext = {
    state: unknown;
    actions: undefined;
    events: undefined;
    selectors: unknown;
    methods: {};
  }
> = F extends [infer First, ...infer Rest]
  ? First extends StoreContext
    ? Rest extends StoreContext[]
      ? MergeArgs<Rest, Merge<Acc, First>>
      : Prettify<Merge<Acc, First>>
    : never
  : Prettify<Acc>;

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

// typer les events ?

/**
 *  REFRESH: action<UserState>()({ // todo try to put here the storeEvents, that may enable to infer the storeevent type and get previous events
        resource: ({ storeEvents }) =>
          resource({
            request: () => {
              if (storeEvents.UPDATE()?.status() !== ResourceStatus.Error) {
                return undefined;
              }
              return this.updateItem();
            },
            // remember: if updateItem -> request is undefined the laoder won't becalled, and the resource status will be idle
            loader: ({ request }) =>
              this.apiService.getItemById(request?.id ?? ''),
          }),
 */

function withMethods<
  Inputs extends StoreContext,
  Methods extends Record<string, (...data: any[]) => unknown>
>(
  methodsFactory: (inputs: Prettify<Pick<Inputs, 'state'>>) => Methods
): Merge<Inputs, StoreContext & { methods: Methods }> {
  return {} as Merge<Inputs, StoreContext & { methods: Methods }>;
}
function withState<
  Inputs extends StoreContext,
  State extends StoreContext['state']
>(methodsFactory: State): Merge<Inputs, StoreContext & { state: State }> {
  return {} as Merge<Inputs, { state: State }>;
}
function withFeature<Inputs extends StoreContext, Feature extends StoreContext>(
  featureFactory: Feature
): Merge<Inputs, Feature> {
  return {} as Merge<Inputs, Feature>;
}

// selector with the same name will render never
const test2 = pipe(
  {
    state: {
      users: [] as { id: string; name: string }[],
    },
    actions: 'updateAction',
    events: 'update',
    selectors: {
      test: true,
      test1: true,
    },
  },
  withState({
    GetStatus: true,
  }),
  withFeature({
    state: {
      feature: true,
    },
    actions: 'GET',
    events: 'GET',
    selectors: {
      test2: false,
    },
  }),
  withMethods((inputs) => ({
    setName: (name: string, id: string) => {
      return {
        ...inputs.state,
        users: inputs.state.users.map((user) => {
          if (user.id === id) {
            return { ...user, name };
          }
          return user;
        }),
      };
    },
  }))
);

function pipe<const A extends StoreContext>(a: A): A;
function pipe<const A extends StoreContext, const B extends StoreContext>(
  a: A,
  b: Merge<A, B>
): MergeArgs<[A, B]>;
function pipe<
  const A extends StoreContext,
  const B extends StoreContext,
  const C extends StoreContext
>(
  a: A,
  b: Merge<MergeArgs<[{}, A]>, B>,
  c: Merge<MergeArgs<[A, B]>, C>
): MergeArgs<[A, B, C]>;
function pipe<
  const A extends StoreContext,
  const B extends StoreContext,
  const C extends StoreContext,
  const D extends StoreContext
>(
  a: A,
  b: Merge<A, B>,
  c: Merge<MergeArgs<[A, B]>, C>,
  d: Merge<MergeArgs<[A, B, C]>, D>
): MergeArgs<[A, B, C, D]>;
function pipe<
  const A extends StoreContext,
  const B extends StoreContext,
  const C extends StoreContext,
  const D extends StoreContext,
  const E extends StoreContext
>(
  a: A,
  b: Merge<A, B>,
  c: Merge<MergeArgs<[A, B]>, C>,
  d: Merge<MergeArgs<[A, B, C]>, D>,
  e: Merge<MergeArgs<[A, B, C, D]>, E>
): MergeArgs<[A, B, C, D, E]>;
function pipe<
  const A extends StoreContext,
  const B extends StoreContext,
  const C extends StoreContext,
  const D extends StoreContext,
  const E extends StoreContext,
  const F extends StoreContext
>(
  a: A,
  b: Merge<A, B>,
  c: Merge<MergeArgs<[A, B]>, C>,
  d: Merge<MergeArgs<[A, B, C]>, D>,
  e: Merge<MergeArgs<[A, B, C, D]>, E>,
  f: Merge<MergeArgs<[A, B, C, D, E]>, F>
): MergeArgs<[A, B, C, D, E, F]>;
function pipe(...operations: StoreContext[]): StoreContext {
  return operations as any as StoreContext;
}
