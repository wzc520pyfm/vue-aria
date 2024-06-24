import {toValue} from 'vue'
import type {Ref, ToRefs} from 'vue'

// TODO: move util type for shared
type NonUndefined<T> = T extends undefined ? never : T
export type ToValuesForFunction<T extends ToRefs<T>> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [K in keyof T]: T[K] extends Ref<NonUndefined<infer V>> ? (V extends Function ? V : T[K]) : never
}
export function toValuesForFunction<T extends ToRefs<T>>(obj: T): ToValuesForFunction<T> {
  return Object.fromEntries(
    Object.entries<Ref<unknown>>(obj).map(([key, value]) => [
      key,
      typeof toValue(value) === 'function' ? toValue(value) : value,
    ]),
  ) as ToValuesForFunction<T>
}
