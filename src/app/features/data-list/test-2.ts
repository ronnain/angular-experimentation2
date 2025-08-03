import { map, Observable, of, Subject } from 'rxjs';

const test = of({
  page: 1,
}).pipe(
  (context) =>
    withEntities(context, {
      api: (srcContext) =>
        of([
          {
            id: '1',
            name: 'name',
          },
        ]),
    }),
  (context) =>
    withEntityActionLevel(context, {
      update: provideActionLevel({
        src: () => of({ page: 1 }),
        api: (actionSrc) => of({ id: '2' }),
      }),
      create: provideActionLevel({
        src: () => new Subject<string>(),
        api: (actionSrc) => of({ id: 5 }),
      }),
    }),
  (context) =>
    withReducers(context, {
      update: {
        onLoaded: ({ srcContext }) => [{ id: '3', name: 'name' }],
      },
      create: {
        onLoaded: ({ srcContext }) => [{ id: '4', name: 'name' }],
      },
    })
);

test.subscribe((data) => {
  data.entityLevelActionData.update;
});

function withEntities<Context, TData>(
  context: Observable<Context>,
  data: {
    api: (srcContext: Context) => Observable<TData[]>;
  }
) {
  //@ts-ignore
  return data.api(context).pipe(
    map((entities) => ({
      context,
      entities,
    }))
  );
}

function provideActionLevel<A, B>(data: {
  // todo brut force B ?
  src: () => Observable<A>;
  api: (actionSrc: A) => Observable<B>;
}) {
  return data;
}

function withEntityActionLevel<
  Context,
  TData,
  const ActionNames extends keyof Actions,
  Actions extends Record<
    ActionNames,
    {
      src: () => Observable<any>;
      api: (actionSrc: any) => Observable<TData>;
    }
  >
>(context: Observable<Context>, data: Actions) {
  return context.pipe(
    map((contextValue) => ({ ...contextValue, entityLevelActionData: data }))
  );
}

function withReducers<
  SrcContext,
  ActionsKeys extends keyof Context['entityLevelActionData'],
  Context extends {
    context: Observable<SrcContext>;
    entityLevelActionData: Record<ActionsKeys, any>;
  },
  TData,
  TReducer extends Record<
    ActionsKeys,
    {
      onLoaded: (reducerParams: { srcContext: SrcContext }) => TData[];
    }
  >
>(context: Observable<Context>, data: TReducer) {
  return context.pipe(
    map((contextValue) => ({ ...contextValue, reducers: data }))
  );
}
