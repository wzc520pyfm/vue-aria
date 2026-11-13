import type {Ref} from 'vue'
import type {Collection, CollectionNode, Key} from 'vue-stately/useListState'
import type {DisabledBehavior} from 'vue-stately/useMultipleSelectionState'

export interface ListKeyboardDelegateOptions<T> {
  collection: Collection<T> | (() => Collection<T>)
  ref: Ref<HTMLElement | null>
  collator?: Intl.Collator
  layout?: 'stack' | 'grid'
  orientation?: 'vertical' | 'horizontal'
  direction?: 'ltr' | 'rtl'
  disabledKeys?: Set<Key> | (() => Set<Key>)
  disabledBehavior?: DisabledBehavior | (() => DisabledBehavior)
  layoutDelegate?: unknown
}

export class ListKeyboardDelegate<T> {
  private opts: ListKeyboardDelegateOptions<T>

  constructor(options: ListKeyboardDelegateOptions<T>) {
    this.opts = options
    this.getKeyBelow = this.getKeyBelow.bind(this)
    this.getKeyAbove = this.getKeyAbove.bind(this)
    this.getFirstKey = this.getFirstKey.bind(this)
    this.getLastKey = this.getLastKey.bind(this)
    this.getKeyForSearch = this.getKeyForSearch.bind(this)
    this.getNextKey = this.getNextKey.bind(this)
    this.getPreviousKey = this.getPreviousKey.bind(this)
  }

  private get collection(): Collection<T> {
    const c = this.opts.collection as any
    return typeof c === 'function' ? c() : c
  }
  private get disabledKeys(): Set<Key> {
    const d = this.opts.disabledKeys as any
    return typeof d === 'function' ? d() : (d ?? new Set())
  }
  private get disabledBehavior(): DisabledBehavior {
    const d = this.opts.disabledBehavior as any
    return typeof d === 'function' ? d() : (d ?? 'all')
  }
  private get collator() { return this.opts.collator ?? new Intl.Collator(undefined, {usage: 'search', sensitivity: 'base'}) }
  private get layout() { return this.opts.layout ?? 'stack' }
  private get orientation() { return this.opts.orientation ?? 'vertical' }

  private isDisabled(item: CollectionNode<unknown>): boolean {
    return this.disabledBehavior === 'all' && (item.props?.isDisabled || this.disabledKeys.has(item.key))
  }

  private findNextNonDisabled(key: Key | null, getNext: (key: Key) => Key | null): Key | null {
    let nextKey = key
    while (nextKey != null) {
      const item = this.collection.getItem(nextKey)
      if (item && item.type === 'item' && !this.isDisabled(item)) return nextKey
      nextKey = getNext(nextKey)
    }
    return null
  }

  getNextKey(key: Key): Key | null {
    return this.findNextNonDisabled(this.collection.getKeyAfter(key), k => this.collection.getKeyAfter(k))
  }
  getPreviousKey(key: Key): Key | null {
    return this.findNextNonDisabled(this.collection.getKeyBefore(key), k => this.collection.getKeyBefore(k))
  }

  getKeyBelow(key: Key): Key | null {
    if (this.orientation === 'horizontal' || this.layout === 'grid') return this.getNextKey(key)
    return this.getNextKey(key)
  }
  getKeyAbove(key: Key): Key | null {
    if (this.orientation === 'horizontal' || this.layout === 'grid') return this.getPreviousKey(key)
    return this.getPreviousKey(key)
  }
  getKeyPageBelow(key: Key): Key | null { return this.getLastKey() }
  getKeyPageAbove(key: Key): Key | null { return this.getFirstKey() }

  getFirstKey(): Key | null {
    let key = this.collection.getFirstKey()
    while (key != null) {
      const item = this.collection.getItem(key)
      if (item && item.type === 'item' && !this.isDisabled(item)) return key
      key = this.collection.getKeyAfter(key)
    }
    return null
  }

  getLastKey(): Key | null {
    let key = this.collection.getLastKey()
    while (key != null) {
      const item = this.collection.getItem(key)
      if (item && item.type === 'item' && !this.isDisabled(item)) return key
      key = this.collection.getKeyBefore(key)
    }
    return null
  }

  getKeyForSearch(search: string, fromKey?: Key): Key | null {
    if (!this.collator) return null
    let key = fromKey ?? this.getFirstKey()
    const startKey = key
    let wrapped = false
    while (key != null) {
      const item = this.collection.getItem(key)
      if (item && item.type === 'item' && !this.isDisabled(item)) {
        const textValue = item.textValue ?? ''
        if (textValue && this.collator.compare(textValue.slice(0, search.length), search) === 0) {
          return key
        }
      }
      key = this.getNextKey(key)
      if (key == null && !wrapped) { key = this.getFirstKey(); wrapped = true }
      if (wrapped && key === startKey) break
    }
    return null
  }
}
