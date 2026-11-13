/*
 * Official set-equality helper from
 * `packages/react-stately/src/selection/useMultipleSelectionState.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc
 * (react-stately@3.51.0).
 */

import type {Key} from '../collections/types'

/** Official `equalSets` comparison (order-insensitive key set equality). */
export function equalSets(setA: Iterable<Key>, setB: Iterable<Key>): boolean {
  const keysA = setA instanceof Set ? setA : new Set(setA)
  const keysB = setB instanceof Set ? setB : new Set(setB)

  if (keysA.size !== keysB.size) {
    return false
  }

  for (let item of keysA) {
    if (!keysB.has(item)) {
      return false
    }
  }

  return true
}
