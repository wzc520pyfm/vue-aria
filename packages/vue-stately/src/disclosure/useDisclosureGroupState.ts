/*
 * Port of `react-stately@3.51.0` `useDisclosureGroupState`
 * (`packages/react-stately/src/disclosure/useDisclosureGroupState.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc),
 * adapted for Vue. `allowsMultipleExpanded`, `isDisabled`, and `expandedKeys`
 * are live getters. `toggleKey` / `setExpandedKeys` read the current values
 * at call time. Switching off multiple expansion keeps the first key.
 */

import {computed, toValue, watch, type MaybeRefOrGetter} from 'vue'
import type {Key} from '../collections/types'
import {useControlledState} from '../utils/useControlledState'

export interface DisclosureGroupProps {
  /** Whether multiple items can be expanded at the same time. */
  allowsMultipleExpanded?: MaybeRefOrGetter<boolean | undefined>
  /** Whether all items are disabled. */
  isDisabled?: MaybeRefOrGetter<boolean | undefined>
  /** The currently expanded keys in the group (controlled). */
  expandedKeys?: MaybeRefOrGetter<Iterable<Key> | undefined>
  /** The initial expanded keys in the group (uncontrolled). */
  defaultExpandedKeys?: MaybeRefOrGetter<Iterable<Key> | undefined>
  /** Handler that is called when items are expanded or collapsed. */
  onExpandedChange?: (keys: Set<Key>) => void
}

export interface DisclosureGroupState {
  /** Whether multiple items can be expanded at the same time. */
  readonly allowsMultipleExpanded: boolean
  /** Whether all items are disabled. */
  readonly isDisabled: boolean
  /** A set of keys for items that are expanded. */
  readonly expandedKeys: Set<Key>
  /** Toggles the expanded state for an item by its key. */
  toggleKey(key: Key): void
  /** Replaces the set of expanded keys. */
  setExpandedKeys(keys: Set<Key>): void
}

function toKeySet(value: Iterable<Key> | undefined): Set<Key> | undefined {
  if (value == null) return undefined
  return new Set(value)
}

/**
 * Manages state for a group of disclosures, e.g. an accordion.
 * It supports both single and multiple expanded items.
 */
export function useDisclosureGroupState(props: DisclosureGroupProps = {}): DisclosureGroupState {
  const controlledKeys = computed(() => toKeySet(toValue(props.expandedKeys)))
  const initialDefault = toKeySet(toValue(props.defaultExpandedKeys)) ?? new Set<Key>()

  const [expandedKeys, setExpandedKeys] = useControlledState<Set<Key>>(
    controlledKeys,
    initialDefault,
    props.onExpandedChange,
  )

  // Official effect: when multiple expansion is turned off, keep the first key.
  watch(
    [() => Boolean(toValue(props.allowsMultipleExpanded)), expandedKeys],
    ([allows, keys]) => {
      if (!allows && keys.size > 1) {
        const firstKey = keys.values().next().value
        if (firstKey != null) {
          setExpandedKeys(new Set([firstKey]))
        }
      }
    },
    {immediate: true},
  )

  const state: DisclosureGroupState = {
    get allowsMultipleExpanded() {
      return Boolean(toValue(props.allowsMultipleExpanded))
    },
    get isDisabled() {
      return Boolean(toValue(props.isDisabled))
    },
    get expandedKeys() {
      return expandedKeys.value
    },
    setExpandedKeys,
    toggleKey(key: Key) {
      const allows = Boolean(toValue(props.allowsMultipleExpanded))
      const current = expandedKeys.value
      let keys: Set<Key>
      if (allows) {
        keys = new Set(current)
        if (keys.has(key)) keys.delete(key)
        else keys.add(key)
      } else {
        keys = new Set(current.has(key) ? [] : [key])
      }
      setExpandedKeys(keys)
    },
  }
  return state
}
