/**
 * Minimal official `Collection` / `Node` surface from
 * `packages/@react-types/shared` at
 * adobe/react-spectrum@740c6c5c4a717ca8c82fc4d15d199f6166cd42dc
 * (`react-aria@3.53.1` / `react-stately@3.51.0`).
 */

/** Official `Key` type: `string | number`. */
export type Key = string | number

export type CollectionNodeType = 'item' | 'section' | 'content' | 'loader' | 'cell'

/**
 * Official `Node<T>` trimmed to the fields the selection / list state hooks
 * consume.
 */
export interface CollectionNode<T> {
  /** The unique key of the node. */
  key: Key
  /** The key of the parent node, or null for root-level nodes. */
  parentKey: Key | null
  /** The type of node: item, section, content, loader, or cell. */
  type: CollectionNodeType
  /** The value this node represents, when the item carries one. */
  value: T | null
  /** The props of the rendered element, used for isDisabled / href lookups. */
  props?: Record<string, any> | null
  /** The visual position of the node among its siblings. */
  index: number
  /** The nesting depth of the node. */
  level: number
  /** Whether the node has child nodes (used for sections). */
  hasChildNodes: boolean
  /** Child nodes, when the parent is a section. */
  childNodes?: Iterable<CollectionNode<T>>
  /** Plain-text value used for typeahead / a11y. */
  textValue?: string
  /** Screen-reader-only label for the node, when provided. */
  'aria-label'?: string
  /** The previous key in collection order, used for ordered traversal. */
  prevKey?: Key | null
  /** The next key in collection order, used for ordered traversal. */
  nextKey?: Key | null
}

/**
 * Official `Collection<T>` interface implemented by `ListCollection`.
 */
export interface Collection<T> {
  readonly size: number
  getKeys(): IterableIterator<Key>
  getItem(key: Key): CollectionNode<T> | null
  at(index: number): CollectionNode<T> | null
  getKeyBefore(key: Key): Key | null
  getKeyAfter(key: Key): Key | null
  getFirstKey(): Key | null
  getLastKey(): Key | null
  getChildren(key: Key): Iterable<CollectionNode<T>>
}
