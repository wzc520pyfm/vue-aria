import {toRefs} from 'vue'
import {toValuesForFunction} from './toValuesForFunction'
import type {ToRef} from 'vue'

// TODO: move util type for shared
type NonUndefined<T> = T extends undefined ? never : T
export type ToRefsForNonFunction<T extends object> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [K in keyof T]?: NonUndefined<T[K]> extends Function
    ? NonUndefined<T[K]>
    : ToRef<NonUndefined<T[K]>>
}

export function toRefsForNonFunction<T extends object>(obj: T): ToRefsForNonFunction<T> {
  return toValuesForFunction(toRefs(obj)) as ToRefsForNonFunction<T>
}
