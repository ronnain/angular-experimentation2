import { Observable } from 'rxjs';

// Type pair pour l'API
type ApiPair<T, R> = {
  src: () => Observable<T>;
  api: (params: { srcData: T }) => Observable<R>;
};

// Le type global du registre
type ApiRegistry = Record<string, ApiPair<any, any>>;

// Fonction utilitaire pour ajouter une entrée au registre
function addApi<K extends string, T, R, A extends ApiRegistry>(
  registry: A,
  key: K,
  pair: ApiPair<T, R>
): asserts registry is A & { [P in K]: ApiPair<T, R> } {
  (registry as any)[key] = pair;
}

// Exemple d’utilisation
const api = {} as ApiRegistry;

addApi(api, 'test1', {
  src: () => new Observable<{ page: number }>(),
  api: (params) => {
    // Ici, params.srcData est bien { page: number }
    const srcData = params.srcData;
    return new Observable<number>();
  },
});

addApi(api, 'test2', {
  src: () => new Observable<string>(),
  api: (params) => {
    // Ici, params.srcData est bien string
    const srcData = params.srcData;
    return new Observable<number>();
  },
});

addApi(api, 'test3', {
  src: () =>
    new Observable<{
      data: {
        test: string;
      };
    }>(),
  api: (params) => {
    // Ici, params.srcData est bien string
    const srcData = params.srcData;
    return new Observable<number>();
  },
});

api.test3;
