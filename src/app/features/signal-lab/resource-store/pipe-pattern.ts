type StoreContext = {
  state: unknown;
  actions: unknown;
  events: unknown;
  selectors: unknown;
};

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

const test2 = pipe(
  {
    state: {
      users: [],
    },
    actions: 'update',
    events: 'update',
    selectors: {},
  },
  {
    state: {
      GetStatus: {},
    },
    actions: 'GET',
    events: 'GET',
    selectors: {},
  }
);

function pipe<const A extends StoreContext>(
  a: A
): Prettify<{
  actions: A['actions'];
  state: Prettify<A['state']>;
  events: A['events'];
  selectors: Prettify<A['selectors']>;
}>;
function pipe<const A extends StoreContext, const B extends StoreContext>(
  a: A,
  b: B
): Prettify<{
  actions: A['actions'] | B['actions'];
  state: Prettify<A['state'] & B['state']>;
  events: A['events'] | B['events'];
  selectors: Prettify<A['selectors'] & B['selectors']>;
}>;
function pipe(...operations: StoreContext[]): StoreContext {
  return operations as any as StoreContext;
}
