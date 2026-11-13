/*
 * Selection state for vue-stately, aligned with official
 * `packages/react-stately/src/selection/types.ts` and
 * `packages/react-stately/src/selection/Selection.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc
 * (react-stately@3.51.0).
 */

import type {Ref} from 'vue'
import type {Collection, Key} from '../collections/types'

/** Official `Selection` type: `'all' | Set<Key>`. */
export type Selection = 'all' | Set<Key>

/** Official `SelectionMode`. */
export type SelectionMode = 'none' | 'single' | 'multiple'

/** Official `SelectionBehavior`. */
export type SelectionBehavior = 'toggle' | 'replace'

/** Official `DisabledBehavior`. */
export type DisabledBehavior = 'all' | 'selection'

/** Official `FocusStrategy` for child focus. */
export type FocusStrategy = 'first' | 'last' | null

/** Official focused-state contract shared by single / multiple selection state. */
export interface FocusState {
  readonly isFocused: boolean
  setFocused: (isFocused: boolean) => void
  readonly focusedKey: Key | null
  readonly childFocusStrategy: FocusStrategy | null
  setFocusedKey: (key: Key | null, childFocusStrategy?: FocusStrategy) => void
}

/** Official focused state as exposed by the Vue state hook (reactive refs + sync setters). */
export interface FocusStateRefs {
  readonly isFocused: Ref<boolean>
  setFocused: (isFocused: boolean) => void
  readonly focusedKey: Ref<Key | null>
  readonly childFocusStrategy: Ref<FocusStrategy | null>
  setFocusedKey: (key: Key | null, childFocusStrategy?: FocusStrategy) => void
}

/** Official `MultipleSelectionState` returned by `useMultipleSelectionState`. */
export interface MultipleSelectionState extends FocusStateRefs {
  /** The type of selection that is allowed in the collection. */
  readonly selectionMode: Ref<SelectionMode>
  /** The selection behavior for the collection. */
  readonly selectionBehavior: Ref<SelectionBehavior>
  /** Sets the selection behavior for the collection. */
  setSelectionBehavior: (selectionBehavior: SelectionBehavior) => void
  /** Whether the collection allows empty selection. */
  readonly disallowEmptySelection: Ref<boolean>
  /** The currently selected keys in the collection. `'all'` or a key set. */
  readonly selectedKeys: Ref<Selection>
  /** Sets the selected keys in the collection. */
  setSelectedKeys: (keys: Selection) => void
  /** The currently disabled keys in the collection. */
  readonly disabledKeys: Ref<Set<Key>>
  /** Whether `disabledKeys` applies to selection, actions, or both. */
  readonly disabledBehavior: Ref<DisabledBehavior>
}

/**
 * Official `MultipleSelectionManager` contract: plain (non-ref) values for
 * reads used during render, plus imperative mutation methods. Backed by the
 * reactive refs of the matching {@link MultipleSelectionState}.
 */
export interface MultipleSelectionManager extends FocusState {
  /** The collection of nodes that the selection manager handles. */
  collection: Collection<unknown>
  /** The type of selection that is allowed in the collection. */
  readonly selectionMode: SelectionMode
  /** The selection behavior for the collection. */
  readonly selectionBehavior: SelectionBehavior
  /** Whether the collection allows empty selection. */
  readonly disallowEmptySelection: boolean
  /** The currently selected keys in the collection. */
  readonly selectedKeys: Set<Key>
  /** Whether the selection is empty. */
  readonly isEmpty: boolean
  /** Whether all items in the collection are selected. */
  readonly isSelectAll: boolean
  /** The first selected key in the collection. */
  readonly firstSelectedKey: Key | null
  /** The last selected key in the collection. */
  readonly lastSelectedKey: Key | null
  /** The currently disabled keys in the collection. */
  readonly disabledKeys: Set<Key>
  /** Whether `disabledKeys` applies to selection, actions, or both. */
  readonly disabledBehavior: DisabledBehavior
  /** Returns whether a key is selected. */
  isSelected: (key: Key) => boolean
  /** Returns whether the current selection is equal to the given selection. */
  isSelectionEqual: (selection: Set<Key>) => boolean
  /** Extends the selection to the given key. */
  extendSelection: (toKey: Key) => void
  /** Toggles whether the given key is selected. */
  toggleSelection: (key: Key) => void
  /** Replaces the selection with only the given key. */
  replaceSelection: (key: Key) => void
  /** Replaces the selection with the given keys. */
  setSelectedKeys: (keys: Iterable<Key>) => void
  /** Selects all items in the collection. */
  selectAll: () => void
  /** Removes all keys from the selection. */
  clearSelection: () => void
  /** Toggles between select all and an empty selection. */
  toggleSelectAll: () => void
  /**
   * Toggles, replaces, or extends selection to the given key depending on the
   * pointer event and the collection's selection behavior.
   */
  select: (key: Key, e?: unknown) => void
  /** Returns whether the given key can be selected. */
  canSelectItem: (key: Key) => boolean
  /** Returns whether the given key is disabled. */
  isDisabled: (key: Key) => boolean
  /** Sets the selection behavior for the collection. */
  setSelectionBehavior: (selectionBehavior: SelectionBehavior) => void
  /** Returns whether the given key is a hyperlink. */
  isLink: (key: Key) => boolean
  /** Returns the props for the given item. */
  getItemProps: (key: Key) => Record<string, any> | undefined
}

export interface UseMultipleSelectionStateProps {
  /** How multiple selection should behave in the collection. */
  selectionMode?: import('vue').MaybeRefOrGetter<SelectionMode>
  /** Whether the collection allows empty selection. */
  disallowEmptySelection?: import('vue').MaybeRefOrGetter<boolean>
  /** How selection should behave in the collection. */
  selectionBehavior?: import('vue').MaybeRefOrGetter<SelectionBehavior>
  /** The currently selected keys. Controlled value. */
  selectedKeys?: import('vue').MaybeRefOrGetter<Selection | undefined>
  /** The initial selected keys, for uncontrolled usage. */
  defaultSelectedKeys?: import('vue').MaybeRefOrGetter<Selection | Iterable<Key> | undefined>
  /** Called when the selection changes. */
  onSelectionChange?: (selection: Selection) => void
  /** The keys that are disabled. */
  disabledKeys?: import('vue').MaybeRefOrGetter<Iterable<Key> | undefined>
  /** Whether `onSelectionChange` should fire even if the selection did not change. */
  allowDuplicateSelectionEvents?: import('vue').MaybeRefOrGetter<boolean>
  /** Whether `disabledKeys` applies to selection, actions, or both. */
  disabledBehavior?: import('vue').MaybeRefOrGetter<DisabledBehavior>
}

export interface ListProps<T> {
  /** The items of the list, for dynamic collections. */
  items?: Iterable<T>
  /** Prebuilt collection, when the caller owns collection construction. */
  collection?: Collection<T>
  /** Filter function to generate a filtered list of nodes. */
  filter?: (nodes: Iterable<Collection<unknown>>) => Iterable<Collection<unknown>>
  /** A delegate object that provides layout information for items. */
  layoutDelegate?: unknown
}

export interface ListState<T> {
  /** The collection of items in the list. */
  collection: import('vue').ComputedRef<Collection<T>>
  /** A set of items that are disabled. */
  disabledKeys: import('vue').Ref<Set<Key>>
  /** A selection manager to read and update multiple selection state. */
  selectionManager: MultipleSelectionManager
}
