/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import {computed, shallowRef, toValue, watch, type ComputedRef} from 'vue'
import type {Collection, CollectionNode, Key} from '../collections/types'
import {ListCollection} from '../collections/ListCollection'
import {buildCollectionFromItems} from '../collections/buildCollection'
import {useMultipleSelectionState} from '../selection/useMultipleSelectionState'
import {SelectionManager} from '../selection/SelectionManager'
import type {ListProps, ListState, UseMultipleSelectionStateProps} from '../selection/types'

export interface UseListStateProps<T> extends UseMultipleSelectionStateProps, Omit<ListProps<T>, 'filter'> {
  /** Prebuilt nodes (Vue slot-based builder). */
  nodes?: Iterable<CollectionNode<T>> | (() => Iterable<CollectionNode<T>>)
  /** Filter function to generate a filtered list of nodes. */
  filter?: (nodes: Iterable<CollectionNode<T>>) => Iterable<CollectionNode<T>>
}

function useFocusedKeyReset<T>(collection: ComputedRef<Collection<T>>, selectionManager: SelectionManager) {
  let lastCollection: Collection<T> | null = null
  watch(
    collection,
    (current) => {
      const focusedKey = selectionManager.focusedKey
      if (focusedKey != null && lastCollection && lastCollection !== current && !current.getItem(focusedKey)) {
        let key = lastCollection.getKeyAfter(focusedKey)
        let nextFocusedKey: Key | null = null
        while (key != null) {
          const node = current.getItem(key)
          if (node && node.type === 'item' && !selectionManager.isDisabled(key)) {
            nextFocusedKey = key
            break
          }
          key = lastCollection.getKeyAfter(key)
        }
        if (nextFocusedKey == null) {
          key = lastCollection.getKeyBefore(focusedKey)
          while (key != null) {
            const node = current.getItem(key)
            if (node && node.type === 'item' && !selectionManager.isDisabled(key)) {
              nextFocusedKey = key
              break
            }
            key = lastCollection.getKeyBefore(key)
          }
        }
        selectionManager.setFocusedKey(nextFocusedKey)
      }
      lastCollection = current
    },
    {flush: 'sync'},
  )
}

/**
 * Provides state management for list-like components. Handles building a
 * collection of items from props, and manages multiple selection state.
 */
export function useListState<T>(props: UseListStateProps<T>): ListState<T> {
  const selectionState = useMultipleSelectionState(props)

  const collection = computed<Collection<T>>(() => {
    const provided = (props as any).collection as Collection<T> | undefined
    if (provided) return provided

    const filter = (props as any).filter as ((nodes: Iterable<CollectionNode<T>>) => Iterable<CollectionNode<T>>) | undefined
    const nodesProp = (props as any).nodes
    if (nodesProp) {
      const nodes = typeof nodesProp === 'function' ? nodesProp() : nodesProp
      return new ListCollection<T>((filter ? filter(nodes) : nodes) as Iterable<CollectionNode<T>>)
    }

    const items = toValue((props as any).items) as Iterable<T> | undefined
    const built = buildCollectionFromItems<T>(items)
    return new ListCollection<T>((filter ? filter(built) : built) as Iterable<CollectionNode<T>>)
  })

  const selectionManager = new SelectionManager(collection as any, selectionState, {
    layoutDelegate: (props as any).layoutDelegate,
  }) as unknown as ListState<T>['selectionManager']

  useFocusedKeyReset(collection, selectionManager as any)

  const disabledKeys = computed(
    () => new Set<Key>((toValue(props.disabledKeys) as Iterable<Key> | undefined) ?? []),
  ) as unknown as import('vue').Ref<Set<Key>>

  return {
    collection: collection as ComputedRef<Collection<T>>,
    disabledKeys,
    selectionManager,
  }
}
