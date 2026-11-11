import {chain} from './chain'

export type Props = Record<string, any>
type PropsArg = Props | null | undefined

/**
 * Merge several prop objects, chaining function values (event handlers) in order.
 */
export function mergeProps<T extends PropsArg[]>(...args: T): Props {
  const result: Props = {...(args[0] ?? {})}
  for (let i = 1; i < args.length; i++) {
    const props = args[i]
    if (!props) continue
    for (const key of Object.keys(props)) {
      const a = result[key]
      const b = props[key]
      if (typeof a === 'function' && typeof b === 'function') {
        result[key] = chain(a, b)
      } else if (b !== undefined) {
        result[key] = b
      }
    }
  }
  return result
}
