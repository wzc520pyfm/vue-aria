/**
 * Condition and narrow union type
 * @param p this arg's type should be union type
 * @param c condition
 * @returns condition result
 */
export function narrow<T>(p: any, c: boolean | (() => boolean)): p is T {
  return typeof c === 'function' ? c() : c
}
