/*
 * Collection state for vue-stately, aligned with official
 * `packages/react-stately/src/list/ListCollection.ts` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc
 * (react-stately@3.51.0).
 */

import type {Collection, CollectionNode, Key} from '../collections/types'

/**
 * Official `ListCollection`: an immutable, ordered collection of list nodes
 * built from rendered children. Only `section` and `item` nodes are counted
 * towards `size` (so loaders / content nodes do not flip the empty state).
 */
export class ListCollection<T> implements Collection<T> {
  private keyMap: Map<Key, CollectionNode<T>> = new Map()
  private iterable: Iterable<CollectionNode<T>>
  private firstKey: Key | null = null
  private lastKey: Key | null = null
  private _size: number

  constructor(nodes: Iterable<CollectionNode<T>>) {
    this.iterable = nodes

    let visit = (node: CollectionNode<T>) => {
      this.keyMap.set(node.key, node)

      if (node.childNodes && node.type === 'section') {
        for (let child of node.childNodes) {
          visit(child)
        }
      }
    }

    for (let node of nodes) {
      visit(node)
    }

    let last: CollectionNode<T> | null = null
    let index = 0
    let size = 0
    for (let [key, node] of this.keyMap) {
      if (last) {
        last.nextKey = key
        node.prevKey = last.key
      } else {
        this.firstKey = key
        node.prevKey = undefined
      }

      if (node.type === 'item') {
        node.index = index++
      }

      // Only count sections and items when determining size so that loaders
      // and separators in RAC/S2 do not influence the empty-state determination.
      if (node.type === 'section' || node.type === 'item') {
        size++
      }

      last = node

      // Set nextKey as undefined since this might be the last node. If it is
      // not the last node, last.nextKey will properly be set at start of loop.
      last.nextKey = undefined
    }
    this._size = size
    this.lastKey = last?.key ?? null
  }

  private nextKey?: Key | null
  private prevKey?: Key | null

  *[Symbol.iterator](): IterableIterator<CollectionNode<T>> {
    yield* this.iterable
  }

  get size(): number {
    return this._size
  }

  getKeys(): IterableIterator<Key> {
    return this.keyMap.keys()
  }

  getKeyBefore(key: Key): Key | null {
    const node = this.keyMap.get(key)
    return node ? (node.prevKey ?? null) : null
  }

  getKeyAfter(key: Key): Key | null {
    const node = this.keyMap.get(key)
    return node ? (node.nextKey ?? null) : null
  }

  getFirstKey(): Key | null {
    return this.firstKey
  }

  getLastKey(): Key | null {
    return this.lastKey
  }

  getItem(key: Key): CollectionNode<T> | null {
    return this.keyMap.get(key) ?? null
  }

  at(idx: number): CollectionNode<T> | null {
    const keys = [...this.getKeys()]
    return this.getItem(keys[idx])
  }

  getChildren(key: Key): Iterable<CollectionNode<T>> {
    const node = this.keyMap.get(key)
    return node?.childNodes || []
  }
}
