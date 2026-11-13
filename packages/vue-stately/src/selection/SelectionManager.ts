/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import type {Ref} from 'vue'
import type {Collection, CollectionNode, Key} from '../collections/types'
import type {
  DisabledBehavior,
  FocusStrategy,
  MultipleSelectionState,
  Selection,
  SelectionBehavior,
  SelectionMode,
} from './types'
import {Selection as SelectionImpl} from './Selection'

export interface SelectionManagerOptions {
  allowsCellSelection?: boolean
  layoutDelegate?: unknown
  fullCollection?: Collection<unknown>
}

function toCollection<T>(source: Collection<T> | Ref<Collection<T>>): Collection<T> {
  const v = (source as Ref<Collection<T>>).value
  return v ?? (source as Collection<T>)
}

/**
 * Vue-adapted SelectionManager aligned with official behavior at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc.
 */
export class SelectionManager {
  collectionSource: Collection<unknown> | Ref<Collection<unknown>>
  state: MultipleSelectionState
  allowsCellSelection: boolean
  layoutDelegate: unknown
  fullCollection: Collection<unknown> | null
  private _isSelectAll: boolean | null = null

  constructor(
    collection: Collection<unknown> | Ref<Collection<unknown>>,
    state: MultipleSelectionState,
    options?: SelectionManagerOptions,
  ) {
    this.collectionSource = collection
    this.state = state
    this.allowsCellSelection = options?.allowsCellSelection ?? false
    this.layoutDelegate = options?.layoutDelegate ?? null
    this.fullCollection = options?.fullCollection ?? null
  }

  get collection(): Collection<unknown> {
    return toCollection(this.collectionSource)
  }

  get selectionMode(): SelectionMode { return this.state.selectionMode.value }
  get disallowEmptySelection(): boolean { return this.state.disallowEmptySelection.value }
  get selectionBehavior(): SelectionBehavior { return this.state.selectionBehavior.value }
  setSelectionBehavior(v: SelectionBehavior) { this.state.setSelectionBehavior(v) }
  get isFocused(): boolean { return this.state.isFocused.value }
  setFocused(v: boolean) { this.state.setFocused(v) }
  get focusedKey(): Key | null { return this.state.focusedKey.value }
  get childFocusStrategy(): FocusStrategy | null { return this.state.childFocusStrategy.value }
  setFocusedKey(key: Key | null, childFocusStrategy?: FocusStrategy) {
    if (key == null || this.collection.getItem(key)) {
      this.state.setFocusedKey(key, childFocusStrategy ?? 'first')
    }
  }

  get rawSelection(): Selection { return this.state.selectedKeys.value }

  get selectedKeys(): Set<Key> {
    return this.rawSelection === 'all' ? new Set(this.getSelectAllKeys()) : (this.rawSelection as Set<Key>)
  }

  isSelected(key: Key): boolean {
    if (this.state.selectionMode.value === 'none') return false
    const mappedKey = this.getKey(key)
    if (mappedKey == null) return false
    return this.rawSelection === 'all' ? this.canSelectItem(mappedKey) : (this.rawSelection as Set<Key>).has(mappedKey)
  }

  get isEmpty(): boolean {
    return this.rawSelection !== 'all' && (this.rawSelection as Set<Key>).size === 0
  }

  get isSelectAll(): boolean {
    if (this.isEmpty) return false
    if (this.rawSelection === 'all') return true
    if (this._isSelectAll != null) return this._isSelectAll
    const allKeys = this.getSelectAllKeys()
    const selectedKeys = this.rawSelection as Set<Key>
    this._isSelectAll = allKeys.every(k => selectedKeys.has(k))
    return this._isSelectAll
  }

  get firstSelectedKey(): Key | null {
    let first: CollectionNode<unknown> | null = null
    for (const key of this.selectedKeys) {
      const item = this.collection.getItem(key)
      if (!first || (item && this.compareNodeOrder(item, first) < 0)) first = item
    }
    return first?.key ?? null
  }

  get lastSelectedKey(): Key | null {
    let last: CollectionNode<unknown> | null = null
    for (const key of this.selectedKeys) {
      const item = this.collection.getItem(key)
      if (!last || (item && this.compareNodeOrder(item, last) > 0)) last = item
    }
    return last?.key ?? null
  }

  get disabledKeys(): Set<Key> { return this.state.disabledKeys.value }
  get disabledBehavior(): DisabledBehavior { return this.state.disabledBehavior.value }

  private getKey(key: Key): Key | null {
    let item = this.collection.getItem(key)
    if (!item) {
      // cell selection not in scope, but keep tolerant
      return null
    }
    // find nearest item ancestor
    while (item && item.type !== 'item' && item.parentKey != null) {
      item = this.collection.getItem(item.parentKey)
    }
    return item && item.type === 'item' ? item.key : null
  }

  isDisabled(key: Key): boolean {
    if (this.state.disabledBehavior.value === 'selection') return false
    return this.state.disabledKeys.value.has(key) || !!this.collection.getItem(key)?.props?.isDisabled
  }

  canSelectItem(key: Key): boolean {
    if (this.state.selectionMode.value === 'none') return false
    // Official behavior: `disabledKeys` always reject selection, regardless of
    // `disabledBehavior` (which only controls whether disabled items stay focusable).
    if (this.state.disabledKeys.value.has(key)) return false
    const item = this.collection.getItem(key)
    if (!item) return false
    if (item.props?.isDisabled) return false
    return true
  }

  private getSelectAllKeys(): Key[] {
    const keys: Key[] = []
    const addKeys = (k: Key | Iterable<CollectionNode<unknown>>) => {
      if (typeof k === 'string' || typeof k === 'number') {
        const item = this.collection.getItem(k)
        if (item) {
          if (item.type === 'item' && this.canSelectItem(k)) keys.push(k)
          if (item.hasChildNodes || item.type === 'section') {
            for (const child of this.collection.getChildren(k)) {
              if (child.type === 'item') addKeys(child.key)
              else addKeys(child.key)
            }
          }
        }
      }
    }
    // iterate all items
    for (const key of this.collection.getKeys()) {
      const item = this.collection.getItem(key)
      if (item?.type === 'item' && this.canSelectItem(key)) keys.push(key)
    }
    // de-dupe
    return Array.from(new Set(keys))
  }

  extendSelection(toKey: Key): void {
    toKey = this.getKey(toKey)!
    if (toKey == null) return

    const selection: Selection = this.rawSelection === 'all'
      ? new SelectionImpl([toKey], toKey, toKey)
      : new SelectionImpl(this.rawSelection as Set<Key>)

    const sel = selection as SelectionImpl
    let anchorKey = sel.anchorKey ?? toKey
    let range = [...this.getKeyRange(anchorKey, sel.currentKey ?? toKey)]
    for (let key of range) sel.delete(key)

    for (let key of this.getKeyRange(toKey, anchorKey)) {
      if (this.canSelectItem(key)) sel.add(key)
    }
    sel.anchorKey = anchorKey
    sel.currentKey = toKey
    this._isSelectAll = null
    this.state.setSelectedKeys(sel)
  }

  private getKeyRange(from: Key, to: Key): Key[] {
    const fromItem = this.collection.getItem(from)
    const toItem = this.collection.getItem(to)
    if (!fromItem || !toItem) return []
    if (this.compareNodeOrder(fromItem, toItem) <= 0) return this.getKeyRangeInternal(from, to)
    return this.getKeyRangeInternal(to, from)
  }

  private getKeyRangeInternal(from: Key, to: Key): Key[] {
    let keys: Key[] = []
    let key: Key | null = from
    while (key != null) {
      let item = this.collection.getItem(key)
      if (item && item.type === 'item' && this.canSelectItem(key)) {
        keys.push(key)
      }
      if (key === to) return keys
      key = this.collection.getKeyAfter(key)
    }
    return []
  }

  toggleSelection(key: Key): void {
    key = this.getKey(key)!
    if (key == null) return
    if (!this.canSelectItem(key)) return

    let selection: Selection = this.rawSelection === 'all'
      ? new SelectionImpl([...this.getSelectAllKeys()])
      : new SelectionImpl(this.rawSelection as Set<Key>)
    const sel = selection as SelectionImpl

    if (sel.has(key)) {
      sel.delete(key)
      sel.anchorKey = undefined as any
      // but keep currentKey?
    } else {
      sel.add(key)
      sel.anchorKey = key
      sel.currentKey = key
    }

    if (this.disallowEmptySelection && sel.size === 0) return
    this._isSelectAll = null
    this.state.setSelectedKeys(sel)
  }

  replaceSelection(key: Key): void {
    key = this.getKey(key)!
    if (key == null) return
    if (this.canSelectItem(key)) {
      const sel = new SelectionImpl([key], key, key)
      this._isSelectAll = null
      this.state.setSelectedKeys(sel)
    } else {
      this._isSelectAll = null
      this.state.setSelectedKeys(new SelectionImpl())
    }
  }

  setSelectedKeys(keys: Iterable<Key>): void {
    const selection = new SelectionImpl()
    for (let key of keys) {
      const k = this.getKey(key)
      if (k != null && this.canSelectItem(k)) {
        selection.add(k)
        if (this.state.selectionMode.value === 'single') break
      }
    }
    this._isSelectAll = null
    this.state.setSelectedKeys(selection)
  }

  selectAll(): void {
    if (this.selectionMode === 'multiple') {
      this._isSelectAll = null
      this.state.setSelectedKeys('all')
    }
  }

  clearSelection(): void {
    if (!this.disallowEmptySelection && (this.rawSelection === 'all' || (this.rawSelection as Set<Key>).size > 0)) {
      this._isSelectAll = null
      this.state.setSelectedKeys(new SelectionImpl())
    }
  }

  toggleSelectAll(): void {
    if (this.isSelectAll) this.clearSelection()
    else this.selectAll()
  }

  select(key: Key, e?: any): void {
    if (this.selectionMode === 'none') return
    if (this.selectionMode === 'single') {
      if (this.isSelected(key) && !this.disallowEmptySelection) this.toggleSelection(key)
      else this.replaceSelection(key)
      return
    }
    if (e && e.shiftKey) {
      this.extendSelection(key)
    } else if (this.selectionBehavior === 'toggle' || (e && (e.metaKey || e.ctrlKey || e.pointerType === 'touch' || e.pointerType === 'virtual'))) {
      this.toggleSelection(key)
    } else {
      this.replaceSelection(key)
    }
  }

  isSelectionEqual(selection: Set<Key>): boolean {
    if (selection === this.selectedKeys) return true
    if (this.rawSelection === 'all') return false
    if (selection.size !== this.selectedKeys.size) return false
    for (const key of selection) if (!this.selectedKeys.has(key)) return false
    return true
  }

  isLink(_key: Key): boolean { return false }
  getItemProps(_key: Key): any { return undefined }

  withCollection(collection: Collection<unknown>) {
    return new SelectionManager(collection, this.state, {
      allowsCellSelection: this.allowsCellSelection,
      layoutDelegate: this.layoutDelegate ?? undefined,
      fullCollection: this.fullCollection ?? undefined,
    })
  }

  private compareNodeOrder(a: CollectionNode<unknown>, b: CollectionNode<unknown>): number {
    if (a === b) return 0
    // simple index comparison in flat traversal order fallback
    const aIdx = this.indexOf(a.key)
    const bIdx = this.indexOf(b.key)
    return aIdx - bIdx
  }

  private indexOf(key: Key): number {
    let i = 0
    for (const k of this.collection.getKeys()) {
      if (k === key) return i
      i++
    }
    return -1
  }
}
