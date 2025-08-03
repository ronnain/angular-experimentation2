function pipe<A, B, C>(
  a: (empty: never) => A,
  b: (a: A) => B,
  c: (b: B) => C
): C;
function pipe(...operations: any[]): any {
  return (input: any) => {
    return operations.reduce((acc, operation) => {
      return operation(acc);
    }, input);
  };
}

function withMethods<Inputs, Outputs>(
  methods: (inputs: Inputs) => Outputs
): (inputs: Inputs) => Outputs {
  return (inputs: Inputs) => {
    return methods(inputs);
  };
}

const result = pipe(
  () => ({ user: { id: '1', name: 'test' } }),
  (state) => ({
    ...state,
    setName: (name: string) => ({
      user: { ...state.user, name },
    }),
  }),
  withMethods((state) => ({}))
  //   (state) => ({
  //     ...state,
  //     selectedUser: -1,
  //     setSelectedUser: (id: number) => ({
  //       ...state,
  //       selectedUser: id,
  //     }),
  //   })
);
