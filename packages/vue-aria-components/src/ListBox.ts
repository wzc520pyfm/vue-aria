import {
  Fragment,
  computed,
  defineComponent,
  h,
  inject,
  isVNode,
  provide,
  ref,
  toValue,
  watch,
  watchEffect,
  cloneVNode,
  type PropType,
  type VNode,
  type VNodeChild,
} from 'vue'
import {mergeProps, toHeroDataAttrs, useSelectable} from 'vue-aria'
import {useListBox} from 'vue-aria/useListBox'
import {useListState} from 'vue-stately/useListState'
import {ListCollection} from 'vue-stately/ListCollection'
import type {CollectionNode, Key} from 'vue-stately/useListState'
import type {Selection} from 'vue-stately/useMultipleSelectionState'
import {Collection as CollectionComponent} from './Collection'
import {ListBoxContextKey, ListStateContextKey} from './context'
import {ListBoxItem} from './ListBoxItem'
import {ListBoxSection} from './ListBoxSection'

export interface ListBoxProps {
  selectionMode?: 'none' | 'single' | 'multiple'
  selectionBehavior?: 'toggle' | 'replace'
  selectedKeys?: Selection
  defaultSelectedKeys?: Selection | Iterable<Key>
  disabledKeys?: Iterable<Key>
  disallowEmptySelection?: boolean
  orientation?: 'vertical' | 'horizontal'
  layout?: 'stack' | 'grid'
  autoFocus?: boolean | 'first' | 'last'
  shouldFocusWrap?: boolean
  shouldSelectOnPressUp?: boolean
  shouldFocusOnHover?: boolean
  escapeKeyBehavior?: 'clearSelection' | 'none'
  items?: any[]
  id?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  label?: string
  renderEmptyState?: (props: any) => any
  onAction?: (key: Key) => void
}

/**
 * Generates a stable, path-based collection key: `$$va-item-<path>` /
 * `$$va-section-<path>`. The path is derived from the nesting of the rendered
 * collection (user ids and generated indices), so keys stay stable across
 * re-renders of the same ListBox instance instead of bumping a module-global
 * counter on every computed run.
 */
function genKey(prefix = 'item', ...segments: Array<string | number>): Key {
  const suffix = segments.join('-')
  return suffix ? `$$va-${prefix}-${suffix}` : `$$va-${prefix}`
}

function flatten(v: VNodeChild): VNode[] {
  if (v == null || typeof v === 'boolean') return []
  if (Array.isArray(v)) return v.flatMap(flatten)
  if (isVNode(v)) {
    if (v.type === Fragment) return flatten(v.children as any)
    return [v]
  }
  return []
}

function getTextContent(vnodes: VNode[] | undefined): string {
  if (!vnodes) return ''
  let out = ''
  for (const n of vnodes) {
    if (n == null) continue
    if (typeof n.children === 'string') out += n.children
    else if (Array.isArray(n.children)) out += getTextContent(n.children as any)
    else if (isVNode(n) && n.children == null && typeof (n as any).type === 'symbol') out += ''
  }
  return out.trim()
}

function getComponentName(v: VNode): string | null {
  const t: any = v.type
  if (!t) return null
  if (typeof t === 'string') return null
  return t.name || t.__name || null
}

interface CollectionWalkResult {
  nodes: CollectionNode<any>[]
  rendered: VNode[]
}

/**
 * Single walk over rendered collection vnodes that builds the collection
 * state (nodes) and produces the renderable vnodes with generated keys
 * injected back into ListBoxItem / ListBoxSection via the public `id` prop.
 */
function buildCollection(
  vnodes: VNodeChild,
  parentKey: Key | null = null,
  level = 0,
  path: Array<Key | number> = [],
  seen: Set<Key> = new Set(),
): CollectionWalkResult {
  const nodes: CollectionNode<any>[] = []
  const rendered: VNode[] = []
  let index = 0
  for (const vnode of flatten(vnodes as any)) {
    const name = getComponentName(vnode)
    const props: any = vnode.props || {}
    if (name === 'Collection') {
      const children = typeof vnode.children === 'object' && vnode.children && 'default' in (vnode.children as any)
        ? ((vnode.children as any).default as any)
        : (vnode.children as any)
      const items = props.items as any[] | undefined
      // Read dependencies so the collection computed invalidates when only deps change.
      void props.dependencies
      const childVNodes = items && Array.isArray(items) && items.length > 0
        ? items.flatMap((item: any) => flatten(((children as any)?.({item})) ?? []))
        : flatten(typeof children === 'function' ? ((children as any)() ?? []) : children)
      const sub = buildCollection(childVNodes, parentKey, level, path, seen)
      nodes.push(...sub.nodes)
      rendered.push(...sub.rendered)
      continue
    }
    if (name === 'ListBoxSection' || props['data-section'] != null) {
      const key = (props.id ?? null) as Key | null
      const sectionKey = key ?? genKey('section', ...path, index)
      const childSlotVNodes = resolveVNodesFromSlot(vnode)
      const childPath = [...path, sectionKey]
      const childResult = buildCollection(childSlotVNodes, sectionKey, level + 1, childPath, seen)
      const sectionVnode = key ? cloneVNode(vnode, {id: sectionKey}) : cloneVNode(vnode, {id: sectionKey})
      const children = vnode.children
      const isScoped = typeof children === 'object' && children && !Array.isArray(children) && 'default' in (children as any)
      if (isScoped) {
        const originalSlot = (children as any).default
        ;(sectionVnode as any).children = {
          ...(children as any),
          default: (...args: any[]) => {
            const result = originalSlot(...args)
            const arr = flatten(result)
            let i = 0
            const injected = arr.map((child: any) => {
              const childName = getComponentName(child)
              const childProps = child?.props || {}
              if (childName === 'ListBoxItem') {
                const childKey = (childProps.id ?? null) ?? genKey('item', ...childPath, i)
                i += 1
                return childProps.id ? child : cloneVNode(child, {id: childKey})
              }
              return child
            })
            return injected
          },
        }
      } else {
        ;(sectionVnode as any).children = injectGeneratedChildIds(childSlotVNodes, childPath)
      }
      nodes.push({
        key: sectionKey,
        parentKey,
        type: 'section',
        value: props.value ?? {key: sectionKey, 'aria-label': props['aria-label']},
        props: {...props, title: props.title},
        index: index++,
        level,
        hasChildNodes: true,
        childNodes: childResult.nodes,
        textValue: props.textValue || getTextContent(flatten(childSlotVNodes)),
        'aria-label': props['aria-label'],
      })
      rendered.push(sectionVnode)
      continue
    }
    if (name === 'ListBoxItem') {
      const key = (props.id ?? null) as Key | null
      const resolvedKey = key ?? genKey('item', ...path, index)
      rendered.push(key ? vnode : cloneVNode(vnode, {id: resolvedKey}))
      nodes.push({
        key: resolvedKey,
        parentKey,
        type: 'item',
        value: props.value ?? {key: resolvedKey},
        props: {...props, isDisabled: !!props.isDisabled},
        index: index++,
        level,
        hasChildNodes: false,
        textValue: props.textValue || getTextContent(flatten(resolveVNodesFromSlot(vnode))),
        'aria-label': props['aria-label'],
      })
      continue
    }
    rendered.push(vnode)
  }
  return {nodes, rendered}
}

function resolveVNodesFromSlot(vnode: VNode): VNode[] {
  const children = vnode.children
  if (typeof children === 'object' && children && !Array.isArray(children) && 'default' in (children as any)) {
    const result = (children as any).default?.() ?? []
    return flatten(result)
  }
  if (Array.isArray(children)) return flatten(children)
  return []
}

function injectGeneratedChildIds(vnodes: VNode[], path: Array<Key | number>): VNode[] {
  const injected: VNode[] = []
  let childIndex = 0
  for (const vnode of vnodes) {
    const name = getComponentName(vnode)
    const props: any = vnode.props || {}
    if (name === 'ListBoxItem') {
      const key = (props.id ?? null) as Key | null
      const resolvedKey = key ?? genKey('item', ...path, childIndex)
      childIndex += 1
      injected.push(key ? vnode : cloneVNode(vnode, {id: resolvedKey}))
    } else if (name === 'ListBoxSection') {
      const key = (props.id ?? null) as Key | null
      const sectionKey = key ?? genKey('section', ...path, childIndex)
      childIndex += 1
      const nestedVnode = key ? cloneVNode(vnode, {id: sectionKey}) : cloneVNode(vnode, {id: sectionKey})
      const nestedChildren = resolveVNodesFromSlot(vnode)
      ;(nestedVnode as any).children = injectGeneratedChildIds(nestedChildren, [...path, sectionKey])
      injected.push(nestedVnode)
    } else {
      injected.push(vnode)
    }
  }
  return injected
}

function buildNodesFromDynamicItems<T>(items: any[] | undefined, slot: ((scope: any) => VNodeChild) | undefined, parentKey: Key | null = null, level = 0): CollectionNode<T>[] {
  const nodes: CollectionNode<T>[] = []
  if (!items) return nodes
  let index = 0
  for (const item of items) {
    const isSection = item && (item.type === 'section' || Array.isArray(item.items) || Array.isArray(item.children))
    if (isSection) {
      const key = item.key ?? item.id ?? genKey('section', index)
      const childItems = item.items ?? item.children ?? []
      const childNodes = buildNodesFromDynamicItems<unknown>(childItems, slot, key, level + 1)
      nodes.push({
        key,
        parentKey,
        type: 'section',
        value: item,
        props: { 'aria-label': item['aria-label'] ?? item.ariaLabel, title: item.title ?? item.name },
        index: index++,
        level,
        hasChildNodes: true,
        childNodes,
        textValue: item.textValue ?? (typeof item.title === 'string' ? item.title : undefined),
        'aria-label': item['aria-label'] ?? item.ariaLabel,
      } as any)
    } else {
      const key = item?.key ?? item?.id ?? item ?? genKey('item', index)
      const textValue = item?.textValue ?? (typeof item === 'string' ? item : item?.name)
      nodes.push({
        key,
        parentKey,
        type: 'item',
        value: item,
        props: { isDisabled: !!item?.isDisabled },
        index: index++,
        level,
        hasChildNodes: false,
        textValue,
      } as any)
    }
  }
  return nodes
}

export const ListBox = defineComponent({
  name: 'ListBox',
  inheritAttrs: false,
  props: {
    selectionMode: {type: String as PropType<'none' | 'single' | 'multiple'>, default: 'none'},
    selectionBehavior: {type: String as PropType<'toggle' | 'replace'>, default: 'toggle'},
    selectedKeys: {type: null as unknown as PropType<Selection | undefined>, default: undefined},
    defaultSelectedKeys: {type: null as unknown as PropType<Selection | Iterable<Key> | undefined>, default: undefined},
    disabledKeys: {type: null as unknown as PropType<Iterable<Key> | undefined>, default: undefined},
    disallowEmptySelection: {type: Boolean, default: false},
    orientation: {type: String as PropType<'vertical' | 'horizontal'>, default: 'vertical'},
    layout: {type: String as PropType<'stack' | 'grid'>, default: 'stack'},
    autoFocus: {type: [Boolean, String] as PropType<boolean | 'first' | 'last'>, default: false},
    shouldFocusWrap: {type: Boolean, default: false},
    shouldSelectOnPressUp: {type: Boolean, default: false},
    shouldFocusOnHover: {type: Boolean, default: false},
    escapeKeyBehavior: {type: String as PropType<'clearSelection' | 'none'>, default: 'clearSelection'},
    items: {type: Array as PropType<any[]>, default: undefined},
    id: {type: String, default: undefined},
    'aria-label': {type: String, default: undefined},
    'aria-labelledby': {type: String, default: undefined},
    label: {type: String, default: undefined},
    renderEmptyState: {type: Function as PropType<((props: any) => any) | undefined>, default: undefined},
    onAction: {type: Function as PropType<((key: Key) => void) | undefined>, default: undefined},
  },
  emits: ['selectionchange', 'action'],
  setup(props, {slots, attrs, emit}) {
    const providedState = inject(ListStateContextKey, null)
    const listRef = ref<HTMLElement | null>(null)

    const renderedChildren = computed<VNode[]>(() => {
      if (props.items) return renderDynamic()
      const result = buildCollection(slots.default?.() ?? [], null, 0)
      return result.rendered
    })

    const nodes = computed(() => {
      if (providedState) return null
      if (props.items) {
        // dynamic items: slot is scoped per item; collection built from data
        return buildNodesFromDynamicItems(props.items, slots.default as any)
      }
      const rendered = slots.default?.() ?? []
      const result = buildCollection(rendered, null, 0)
      return result.nodes
    })

    const localState = providedState ? null : useListState({
      nodes: () => nodes.value ?? [],
      selectionMode: () => props.selectionMode,
      selectionBehavior: () => props.selectionBehavior,
      selectedKeys: () => props.selectedKeys,
      defaultSelectedKeys: () => props.defaultSelectedKeys as any,
      disabledKeys: () => props.disabledKeys,
      disallowEmptySelection: () => props.disallowEmptySelection,
      onSelectionChange: (sel: Selection) => emit('selectionchange', sel),
    } as any)

    const state = (providedState ?? localState)!

    provide(ListStateContextKey, state as any)
    provide(ListBoxContextKey, props as any)

    const {listBoxProps, labelProps, isFocused, isFocusVisible} = useListBox({
      id: () => props.id,
      'aria-label': () => props['aria-label'],
      'aria-labelledby': () => props['aria-labelledby'],
      label: () => props.label,
      selectionMode: () => props.selectionMode,
      selectionBehavior: () => props.selectionBehavior,
      orientation: () => props.orientation,
      layout: () => props.layout,
      autoFocus: () => props.autoFocus,
      shouldFocusWrap: () => props.shouldFocusWrap,
      shouldSelectOnPressUp: () => props.shouldSelectOnPressUp,
      shouldFocusOnHover: () => props.shouldFocusOnHover,
      escapeKeyBehavior: () => props.escapeKeyBehavior,
      disallowEmptySelection: () => props.disallowEmptySelection,
      onAction: (key) => { props.onAction?.(key); emit('action', key) },
    }, state as any, listRef)

    const renderEmptyState = () => {
      if (state.collection.value.size !== 0) return null
      if (slots.empty) return slots.empty({})
      if (props.renderEmptyState) return props.renderEmptyState({})
      return null
    }

    const renderDynamic = (): VNode[] => {
      const items = props.items ?? []
      const out: VNode[] = []
      // if items are sections, render sections/items accordingly
      for (const item of items) {
        const isSection = item && (item.type === 'section' || Array.isArray(item.items) || Array.isArray(item.children))
        if (isSection) {
          const key = item.key ?? item.id ?? genKey('section', items.indexOf(item))
          const childItems = item.items ?? item.children ?? []
          out.push(h(ListBoxSection as any, {id: key, 'aria-label': item['aria-label'] ?? item.ariaLabel, title: item.title ?? item.name}, {
            default: () => childItems.map((child: any) => slots.default ? slots.default({item: child}) : null),
            ...(item.title || item.name ? {header: () => item.title ?? item.name} : {}),
          }))
        } else {
          const vnode = slots.default ? flatten(slots.default({item}) as unknown as VNodeChild)[0] ?? null : null
          const vnodeKey = item?.key ?? item?.id ?? item ?? genKey('item', items.indexOf(item))
          if (vnode) {
            const vnodeWithKey = (vnode as any)?.props?.id ? vnode : cloneVNode(vnode, {id: vnodeKey})
            out.push(vnodeWithKey)
          }
        }
      }
      return out
    }

    const renderChildren = (): VNode[] => {
      if (props.items) return renderDynamic()
      const result = buildCollection(slots.default?.() ?? [], null, 0)
      return result.rendered
    }

    return () => {
      const isEmpty = state.collection.value.size === 0
      const domProps = mergeProps(listBoxProps, attrs, {
        ref: (el: any) => { listRef.value = el },
        class: ['react-aria-ListBox', (attrs as any).class].filter(Boolean),
        'data-layout': props.layout ?? 'stack',
        'data-orientation': props.orientation ?? 'vertical',
        ...toHeroDataAttrs({focused: isFocused.value, focusVisible: isFocusVisible.value}),
        ...(isEmpty ? {'data-empty': 'true'} : {}),
      })
      const children: VNode[] = []
      if (toValue(props.label) != null) {
        children.push(h('span', {...labelProps.value, class: ['react-aria-ListBoxLabel', (attrs as any).class].filter(Boolean)}, toValue(props.label)))
      }
      if (isEmpty) children.push(renderEmptyState())
      else children.push(...renderChildren())
      return h('div', domProps, children)
    }
  },
})

export {ListBoxItem, ListBoxSection, CollectionComponent as Collection}
export {ListBoxContextKey as ListBoxContext, ListStateContextKey as ListStateContext}
