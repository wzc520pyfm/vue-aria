import type {CollectionNode, Key} from './types'

let generatedKey = 0

export function generateCollectionKey(): string {
  return `$$vue-aria-${++generatedKey}`
}

export interface ItemInput<T = unknown> {
  type?: 'item' | 'section' | string
  key?: Key
  id?: Key
  value?: T
  textValue?: string
  title?: unknown
  name?: unknown
  heading?: unknown
  'aria-label'?: string
  isDisabled?: boolean
  disabled?: boolean
  props?: Record<string, any>
  items?: Iterable<ItemInput<T>> | null
  children?: Iterable<ItemInput<T>> | null
  childItems?: Iterable<ItemInput<T>> | null
  [key: string]: any
}

function getItemTextValue<T>(item: ItemInput<T>): string | undefined {
  if (item.textValue != null) return String(item.textValue)
  if (typeof item === 'string' || typeof item === 'number') return String(item)
  const v = item.value ?? item.name ?? item.title
  if (typeof v === 'string' || typeof v === 'number') return String(v)
  return undefined
}

function resolveItemKey<T>(item: ItemInput<T>, explicitId?: Key): Key {
  if (explicitId != null) return explicitId
  if (item.key != null) return item.key
  if (item.id != null) return item.id
  return generateCollectionKey()
}

export function buildCollectionFromItems<T>(
  items: Iterable<T> | undefined | null,
  parentKey: Key | null = null,
  level = 0,
  keyMap?: Map<Key, CollectionNode<T>>,
): CollectionNode<T>[] {
  const nodes: CollectionNode<T>[] = []
  if (!items) return nodes
  let index = 0
  for (const raw of items) {
    const item = raw as unknown as ItemInput<T>
    const type = item?.type === 'section' ? 'section' : 'item'
    const key = resolveItemKey(item)
    if (keyMap?.has(key)) {
      throw new Error(`Duplicate collection key "${String(key)}"`)
    }
    if (type === 'section') {
      const childItems = (item.items ?? item.children ?? item.childItems ?? []) as Iterable<T>
      const sectionNode: CollectionNode<T> = {
        key,
        parentKey,
        type: 'section',
        value: (item.value ?? item) as T,
        props: {
          ...(item.props ?? {}),
          'aria-label': item['aria-label'],
          title: item.title ?? item.name ?? item.heading,
          isDisabled: item.isDisabled ?? item.disabled,
        },
        index: index++,
        level,
        hasChildNodes: true,
        textValue: getItemTextValue(item),
        'aria-label': item['aria-label'],
      }
      const childNodes = buildCollectionFromItems(childItems as any, key, level + 1, keyMap)
      ;(sectionNode as any).childNodes = childNodes
      keyMap?.set(key, sectionNode)
      nodes.push(sectionNode)
    } else {
      const node: CollectionNode<T> = {
        key,
        parentKey,
        type: 'item',
        value: (item.value ?? item) as T,
        props: {
          ...(item.props ?? {}),
          isDisabled: item.isDisabled ?? item.disabled,
          textValue: getItemTextValue(item),
        },
        index: index++,
        level,
        hasChildNodes: false,
        textValue: getItemTextValue(item),
        'aria-label': item['aria-label'],
      }
      keyMap?.set(key, node)
      nodes.push(node)
    }
  }
  return nodes
}

export function buildKeyMap<T>(nodes: Iterable<CollectionNode<T>>): Map<Key, CollectionNode<T>> {
  const map = new Map<Key, CollectionNode<T>>()
  const visit = (node: CollectionNode<T>) => {
    map.set(node.key, node)
    if (node.childNodes) {
      for (const child of node.childNodes) visit(child)
    }
  }
  for (const node of nodes) visit(node)
  return map
}
