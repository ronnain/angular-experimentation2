import { Observable, of } from 'rxjs';

type DataListMainTypeScope = any extends {
  entity: any;
  pagination?: any;
  actions: string;
}
  ? {
      entity: unknown;
      pagination?: unknown;
      actions: string;
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
  actions: 'update' | 'delete';
}>;

type WithEntities<TMainConfig extends DataListMainTypeScope> =
  (TMainConfig['pagination'] extends undefined
    ? {}
    : {
        src: () => Observable<TMainConfig['pagination']>;
      }) & {
    query: (params: {
      data: TMainConfig['pagination'];
    }) => Observable<TMainConfig['entity']>;
  };

function withEntities<TMainConfig extends DataListMainTypeScope>() {
  return (config: WithEntities<TMainConfig>) => config;
}

function action<TMainConfig extends DataListMainTypeScope>() {
  return <TSrc>(
    config: TMainConfig['actions'] extends undefined
      ? {}
      : {
          src: () => Observable<TSrc>;
          query: (params: { data: TSrc }) => Observable<TMainConfig['entity']>;
        }
  ) => config;
}

type WithActions<TMainConfig extends DataListMainTypeScope> = {
  [key in TMainConfig['actions']]: {
    src: () => any;
    query: (params: { data: any }) => Observable<TMainConfig['entity']>;
  };
};

function withActions<TMainConfig extends DataListMainTypeScope>() {
  return (config: WithActions<TMainConfig>) => config;
}

function store<TMainConfig extends DataListMainTypeScope>() {
  return (config: {
    entitiesSrc: WithEntities<TMainConfig>;
    actions: WithActions<TMainConfig>;
  }) => config;
}

const result = store<MyDataListStoreType>()({
  entitiesSrc: withEntities<MyDataListStoreType>()({
    src: () =>
      of({
        page: 1,
      }),
    query: ({ data }) => of({ id: 'test', name: 'test' }),
  }),
  actions: withActions<MyDataListStoreType>()({
    update: action<MyDataListStoreType>()({
      src: () => of({ id: 'test', name: 'test' }),
      query: ({ data }) => of({ id: 'test', name: 'test' }),
    }),
    delete: action<MyDataListStoreType>()({
      src: () => of({ id: 'test' }),
      query: ({ data }) => of({ id: 'test', name: 'test' }),
    }),
  }),
});
