type AnyFn = (...args: any[]) => any

/**
 * Calls all functions in the order they were chained with the same arguments.
 */
export function chain<T extends undefined | AnyFn>(...callbacks: T[]) {
  return (...args: T extends AnyFn ? Parameters<T> : never): void => {
    for (const callback of callbacks) {
      if (typeof callback === 'function') {
        callback(...args)
      }
    }
  }
}
