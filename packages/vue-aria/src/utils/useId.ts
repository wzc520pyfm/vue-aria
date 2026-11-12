import {ref, type Ref} from 'vue'

let increment = 0

/**
 * Stable unique id for a11y associations (aria-labelledby, aria-controls, …).
 * Minimal stand-in for official `useId` — no SSR prefixing in this batch.
 */
export function useId(prefix = 'vue-aria'): Ref<string> {
  return ref(`${prefix}-${++increment}`)
}
