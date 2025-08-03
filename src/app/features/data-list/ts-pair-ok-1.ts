import { Observable } from 'rxjs';

type ApiPair<T, R> = {
  src: () => Observable<T>;
  api: (params: { srcData: T }) => Observable<R>;
};

class Api {
  add<T, K extends string, R>(
    key: K,
    pair: ApiPair<T, R>
  ): asserts this is this & { [k in K]: ApiPair<T, R> } {
    (this as any)[key] = pair;
  }
}

const api: Api = new Api();

api.add('test1', {
  src: () => new Observable<number>(),
  api: (params) => {
    // I would like params.srcData to be inferred as "number"
    const srcData = params.srcData;
    return new Observable<number>();
  },
});

api.add('test2', {
  src: () => new Observable<string>(),
  api: (params) => {
    // I would like params.srcData to be inferred as "string"
    const srcData = params.srcData;
    return new Observable<number>();
  },
});

api.test2; // (property) test2: ApiPair<string, number>
