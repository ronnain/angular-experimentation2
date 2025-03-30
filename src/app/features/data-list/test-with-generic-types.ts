import { Observable, of } from 'rxjs';

type DataListMainTypeScope = any extends {
  entity: infer TEntity;
  pagination?: infer TPagination;
  actions: infer TActions;
}
  ? {
      entity: TEntity;
      pagination?: TPagination;
      actions: TActions;
    }
  : never;
type DataListStoreType<T extends DataListMainTypeScope> = T;
type MyDataListStoreType = DataListStoreType<{
  // autocompletion is enabled
  entity: {
    id: string;
    name: string;
  };
  pagination: {
    page: number;
  };
  actions: 'create' | 'update' | 'delete';
}>;

function withEntities<TMainConfig extends DataListMainTypeScope>() {
  return <TSrc>(
    config: (TMainConfig['pagination'] extends undefined
      ? {}
      : {
          src: () => Observable<TMainConfig['pagination']>;
        }) & {
      api: (params: {
        data: TMainConfig['pagination'];
      }) => Observable<TMainConfig['entity']>;
    }
  ) => ({ entitiesSrc: config });
}

const result = withEntities<MyDataListStoreType>()({
  src: () =>
    of({
      page: 1,
    }),
  api: ({ data }) => of({ id: 'test', name: 'test' }),
});
