/**
 * Port of `react-stately@3.51.0` `useToggleGroupState`
 * (`packages/react-stately/src/toggle/useToggleGroupState.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. Selection fields are live getters. `toggleKey` copies the
 * current set before editing it. `setSelectedKeys` stores or reports that set
 * with no empty-selection or disabled normalization. A controlled value stays
 * on the parent's set when `onSelectionChange` is ignored.
 *
 * The control rules match `useControlledState` (undefined means uncontrolled,
 * uncontrolled writes stay inside the hook, a rejected controlled update does
 * not become the next base, `onChange` runs only when the set reference
 * changes). The shared helper stores its value in `ref()`, and Vue wraps a
 * `Set` in a deep reactive proxy, so this hook keeps the raw `Set` in a
 * `shallowRef` instead. That preserves the pin's set identity: the callback
 * receives the same set the uncontrolled state exposes, and `setSelectedKeys`
 * does not alias a caller's set through a proxy.
 */

import {shallowRef, toValue, type MaybeRefOrGetter} from 'vue'
import type {Key} from '../collections/types'

export type {Key} from '../collections/types'

export interface ToggleGroupProps {
  /**
   * Whether single or multiple selection is enabled.
   * @default 'single'
   */
  selectionMode?: MaybeRefOrGetter<'single' | 'multiple' | undefined>
  /** Whether the collection allows empty selection. */
  disallowEmptySelection?: MaybeRefOrGetter<boolean | undefined>
  /** The currently selected keys in the collection (controlled). */
  selectedKeys?: MaybeRefOrGetter<Iterable<Key> | undefined>
  /** The initial selected keys in the collection (uncontrolled). */
  defaultSelectedKeys?: MaybeRefOrGetter<Iterable<Key> | undefined>
  /** Handler that is called when the selection changes. */
  onSelectionChange?: (keys: Set<Key>) => void
  /** Whether all items are disabled. */
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
}

export interface ToggleGroupState {
  /** Whether single or multiple selection is enabled. */
  readonly selectionMode: 'single' | 'multiple'
  /** Whether all items are disabled. */
  readonly isDisabled: boolean
  /** A set of keys for items that are selected. */
  readonly selectedKeys: Set<Key>
  /** Toggles the selected state for an item by its key. */
  toggleKey(key: Key): void
  /** Sets whether the given key is selected. */
  setSelected(key: Key, isSelected: boolean): void
  /** Replaces the set of selected keys. */
  setSelectedKeys(keys: Set<Key>): void
}

/**
 * Manages state for a group of toggles.
 * It supports both single and multiple selected items.
 */
export function useToggleGroupState(props: ToggleGroupProps = {}): ToggleGroupState {
  const selectionMode = (): 'single' | 'multiple' =>
    toValue(props.selectionMode) === 'multiple' ? 'multiple' : 'single'
  const disallowEmptySelection = () => Boolean(toValue(props.disallowEmptySelection))

  // Read the uncontrolled default on first use, not at setup. A slotted context
  // can throw while resolving; that has to happen from render so the component
  // can recover after the slot changes. `useControlledState` reads its default
  // immediately, which would surface that error from setup instead.
  const internal = shallowRef<Set<Key>>(new Set())
  let defaultReady = false
  function ensureDefault() {
    if (defaultReady) return
    defaultReady = true
    const source = toValue(props.defaultSelectedKeys)
    if (source != null) internal.value = new Set(source)
  }
  let controlledSource: Iterable<Key> | undefined
  let controlledSet: Set<Key> | undefined

  // Copy the parent iterable once per reference. Repeated reads of a rejected
  // controlled value return that same set, which is the base for the next toggle.
  function controlledKeys(): Set<Key> | undefined {
    const source = toValue(props.selectedKeys)
    if (source == null) return undefined
    if (source !== controlledSource || controlledSet == null) {
      controlledSource = source
      controlledSet = new Set(source)
    }
    return controlledSet
  }

  function currentKeys(): Set<Key> {
    const controlled = controlledKeys()
    if (controlled) return controlled
    ensureDefault()
    return internal.value
  }

  function commitKeys(next: Set<Key>) {
    const prev = currentKeys()
    if (controlledKeys() == null) {
      internal.value = next
    }
    if (next !== prev) {
      props.onSelectionChange?.(next)
    }
  }

  const state: ToggleGroupState = {
    get selectionMode() {
      return selectionMode()
    },
    get isDisabled() {
      return Boolean(toValue(props.isDisabled))
    },
    get selectedKeys() {
      return currentKeys()
    },
    setSelectedKeys(keys) {
      commitKeys(keys)
    },
    toggleKey(key) {
      const current = state.selectedKeys
      let keys: Set<Key>
      if (state.selectionMode === 'multiple') {
        keys = new Set(current)
        if (keys.has(key) && (!disallowEmptySelection() || keys.size > 1)) {
          keys.delete(key)
        } else {
          keys.add(key)
        }
      } else {
        keys = new Set(current.has(key) && !disallowEmptySelection() ? [] : [key])
      }
      state.setSelectedKeys(keys)
    },
    setSelected(key, isSelected) {
      if (isSelected !== state.selectedKeys.has(key)) {
        state.toggleKey(key)
      }
    },
  }

  return state
}
