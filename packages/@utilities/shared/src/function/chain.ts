// TODO: move to type shared
type NonUndefined<T> = T extends undefined ? never : T

/**
 * Calls all functions in the order they were chained with the same arguments.
 */
export function chain<T extends undefined | ((...args: any[]) => any)>(...callbacks: T[]) {
  return (...args: Parameters<NonUndefined<T>>): ReturnType<NonUndefined<T>> | undefined => {
    return callbacks.reduce((lastRes, callback) => {
      if (typeof callback === 'function') {
        lastRes = callback(...args)
      }
      return lastRes
    }, undefined)
  }
}

/**
 * Executes the first given executable function.
 */
export function chainPre<T extends undefined | ((...args: any[]) => any)>(...callbacks: T[]) {
  return (...args: Parameters<NonUndefined<T>>): ReturnType<NonUndefined<T>> | undefined => {
    const canExecCb = callbacks.find((cb) => typeof cb === 'function')
    return canExecCb?.(...args)
  }
}
