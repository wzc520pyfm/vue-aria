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
      // Vue patches props by comparing live-read values per key; a key that
      // exists but reads `undefined` would hide its own later appearance from
      // the diff (prev reads 'true' at patch time === next). Skip
      // undefined-valued entries entirely — the key disappears and Vue's
      // old-key-absent handling sets/removes the attribute correctly.
      if (b === undefined) continue
      if (typeof a === 'function' && typeof b === 'function' && (!desc || ('value' in desc)) && (!existingDesc || ('value' in existingDesc))) {
        if (a === b) {
          // Identical reference already in the chain — do not double-invoke.
          continue
        }
        // Chain plain function handlers.
        Object.defineProperty(result, key, {value: chain(a, b), enumerable: true, configurable: true, writable: true})
        continue
      }
      if (desc && ('get' in desc || 'set' in desc)) {
        // Vue proxies may report `set: undefined` on getter-only accessors —
        // treat the setter as absent so writes can replace the property.
        const hasGet = typeof desc.get === 'function'
        const hasSet = typeof desc.set === 'function'
        if (hasGet && hasSet) {
          Object.defineProperty(result, key, {get: desc.get, set: desc.set, enumerable: true, configurable: true})
        } else if (hasGet) {
          // Getter-only accessor: keep the live getter but allow writes to
          // replace the property with a plain value (no setter exists to
          // delegate to), so later code can still mutate the merged result.
          Object.defineProperty(result, key, {
            get: desc.get,
            set: (value: any) => {
              Object.defineProperty(result, key, {
                value,
                enumerable: true,
                configurable: true,
                writable: true,
              })
            },
            enumerable: true,
            configurable: true,
          })
        } else {
          Object.defineProperty(result, key, {set: desc.set, enumerable: true, configurable: true})
        }
        continue
      }
      if (desc) {
        Object.defineProperty(result, key, {...desc, enumerable: true, configurable: true})
      } else {
        ;(result as any)[key] = b
      }
    }
  }
  return result
}
