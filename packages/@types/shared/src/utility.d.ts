import type {MaybeRefOrGetter} from 'vue'

/** Basic */
export type MaybeArray<T> = T | T[]
export type NonUndefined<T> = T extends undefined ? never : T
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never

/** Object */
export type Duplicate<T> = {[P in keyof T]: T[P]}
export type OmitNever<T extends object> = Duplicate<T>[keyof T]
export type FunctionKeys<T extends object> = OmitNever<
  Required<{
    // eslint-disable-next-line @typescript-eslint/ban-types
    [K in keyof T]: NonUndefined<T[K]> extends Function ? K : never
  }>
>
export type RecordToUnion<T extends Record<string, any>> = T[keyof T]

/** Vue */
export type ToMaybeRefOrGettersForNonFunction<T extends object> = {
  [P in keyof T]?: P extends FunctionKeys<T> ? T[P] : MaybeRefOrGetter<NonUndefined<T[P]>>
}
type _EventsToEmits<T extends object> = UnionToIntersection<
  RecordToUnion<{
    [K in keyof T]: K extends `on${infer U}`
      ? T[K] extends (...args: infer E) => infer R
        ? (eventname: Lowercase<U>, ...args: E) => R
        : never
      : never
  }>
>
export type EventsToEmits<T extends object> = _EventsToEmits<Required<T>>
export type VueClass = MaybeArray<string> | MaybeArray<string | {[key: string]: boolean}>
