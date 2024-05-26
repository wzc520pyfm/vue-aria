import {toValue} from 'vue'
import type {Ref, ToRefs} from 'vue'

export type ToValues<T extends ToRefs<T>> = {
  [K in keyof T]: T[K] extends Ref<infer V> ? V : never
}
export function toValues<T extends ToRefs<T>>(obj: T): ToValues<T> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, toValue(value)]),
  ) as ToValues<T>
}
