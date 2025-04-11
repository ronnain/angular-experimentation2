import { Type } from '@angular/core';
import { Observable } from 'rxjs';

type A<TKeys extends keyof T extends string ? keyof T : never, T> = T;
type B<TKeys extends keyof T extends string ? keyof T : never, T> = T;

function testFn<
  TAKeys extends keyof TA extends string ? keyof TA : never,
  TA extends Record<TAKeys, boolean>,
  TBKeys extends keyof TB extends string ? keyof TB : never,
  TB extends Record<TBKeys, boolean>
>(data: { a: TA; b: TB }) {
  return {} as TAKeys | TBKeys;
}

const test = testFn({
  a: {
    a1: true,
    a2: false,
  },
  b: {
    b1: true,
    b2: false,
  },
});
