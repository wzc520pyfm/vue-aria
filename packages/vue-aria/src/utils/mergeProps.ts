import {chain} from './chain'

export type Props = Record<string, any>
type PropsArg = Props | null | undefined

/**
 * Merge several prop objects, chaining function values (event handlers) in order.
 * Preserves property getters/setters when possible so reactive prop objects remain live.
 */
export function mergeProps<T extends PropsArg[]>(...args: T): Props {
  const result: Props = {}
  for (const arg of args) {
    if (!arg) continue
    // Copy all enumerable properties including from prototypes? Object.keys is enough for our plain objects.
    for (const key of Object.keys(arg)) {
      const desc = Object.getOwnPropertyDescriptor(arg, key)
      const existingDesc = Object.getOwnPropertyDescriptor(result, key)
      const a = (result as any)[key]
      const b = (arg as any)[key]
      if (typeof a === 'function' && typeof b === 'function' && (!desc || ('value' in desc)) && (!existingDesc || ('value' in existingDesc))) {
        // Chain plain function handlers.
        Object.defineProperty(result, key, {value: chain(a, b), enumerable: true, configurable: true, writable: true})
        continue
      }
      if (b === undefined) continue
      if (desc && ('get' in desc || 'set' in desc)) {
        // Preserve accessor so reads stay reactive/live.
        Object.defineProperty(result, key, {...desc, enumerable: true, configurable: true})
      } else if (desc) {
        Object.defineProperty(result, key, {...desc, enumerable: true, configurable: true})
      } else {
        ;(result as any)[key] = b
      }
    }
  }
  return result
}
