import { Observable, catchError, of, startWith, map } from 'rxjs';

type SatedStreamResult<T> = {
  isLoading: boolean;
  isLoaded: boolean;
  hasError: boolean;
  error: unknown;
  result: T;
};

export type LoadingStateData<T> = {
  readonly isLoading: true;
  readonly isLoaded: false;
  readonly hasError: false;
  readonly error: undefined;
  readonly result: T | undefined;
};

export type LoadedState<T> = {
  readonly isLoading: false;
  readonly isLoaded: true;
  readonly hasError: false;
  readonly error: undefined;
  readonly result: T;
};

export type ErrorState<T> = {
  readonly isLoading: false;
  readonly isLoaded: false;
  readonly hasError: true;
  readonly error: any;
  readonly result: undefined;
};

export type StatedData<T> =
  | LoadedState<T>
  | LoadingStateData<T>
  | ErrorState<T>;

export function statedStream<T>(
  toCall: Observable<T>,
  initialValue: T
): Observable<SatedStreamResult<T>> {
  return toCall.pipe(
    map(
      (result) =>
        ({
          isLoading: false,
          isLoaded: true,
          hasError: false,
          error: undefined,
          result,
        } satisfies SatedStreamResult<T>)
    ),
    startWith({
      isLoading: true,
      isLoaded: false,
      hasError: false,
      error: undefined,
      result: initialValue,
    }),
    catchError((error) =>
      of({
        isLoading: false,
        isLoaded: false,
        hasError: true,
        error,
        result: initialValue,
      })
    )
  );
}
