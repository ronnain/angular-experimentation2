import { Observable } from 'rxjs';

type ApiPair<T, R> = {
  src: () => Observable<T>;
  api: (params: { srcData: T }) => Observable<R>;
};

class Api<TMap extends Record<string, ApiPair<any, any>> = {}> {
  constructor(private readonly map: TMap = {} as TMap) {}

  add<K extends string, T, R>(
    key: K,
    pair: ApiPair<T, R>
  ): Api<TMap & { [P in K]: ApiPair<T, R> }> {
    return new Api({
      ...this.map,
      [key]: pair,
    } as TMap & { [P in K]: ApiPair<T, R> });
  }

  getMap(): TMap {
    return this.map;
  }
}

// Utilisation avec chaînage et inférence de types
const api = new Api()
  .add('test1', {
    src: () => new Observable<{ page: number }>(),
    api: (params) => {
      // ✅ `params.srcData` is inferred as `number`
      const srcData = params.srcData;
      return new Observable<{ data: { id: string; name: string } }>();
    },
  })
  .add('test2', {
    src: () => new Observable<string>(),
    api: (params) => {
      // ✅ `params.srcData` is inferred as `string`
      const srcData = params.srcData;
      return new Observable<number>();
    },
  });

// Pour accéder à une API spécifique avec les bons types :
const test1Api = api.getMap();
// Ici, `test1Api` est bien typé comme `ApiPair<number, number>`
