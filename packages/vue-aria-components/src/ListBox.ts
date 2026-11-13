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
  type PropType,
  type VNode,
  type VNodeChild,
} from 'vue'
import {mergeProps, toHeroDataAttrs} from 'vue-aria'
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

let autoKey = 0
function genKey(prefix = 'item') { return `$$va-${prefix}-${++autoKey}` }

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

function buildNodesFromVNodes(vnodes: VNode[], parentKey: Key | null = null, level = 0): CollectionNode<any>[] {
  const nodes: CollectionNode<any>[] = []
  let index = 0
  for (const vnode of flatten(vnodes as any)) {
    const name = getComponentName(vnode)
    const props: any = vnode.props || {}
    if (name === 'Collection') {
      // Collection component used for grouping in static/dynamic mix; render its slot children
      // but if it has items prop for dynamic inside static, we can't fully evaluate scoped slot here; best effort for children
      const children = typeof vnode.children === 'object' && vnode.children && 'default' in (vnode.children as any)
        ? ((vnode.children as any).default?.() ?? [])
        : (vnode.children as any)
      nodes.push(...buildNodesFromVNodes(flatten(children), parentKey, level))
      continue
    }
    if (name === 'ListBoxSection' || props['data-section'] != null) {
      const key = props.id ?? genKey('section')
      const childSlot = typeof vnode.children === 'object' && vnode.children && 'default' in (vnode.children as any)
        ? ((vnode.children as any).default?.() ?? [])
        : []
      const headerSlot = typeof vnode.children === 'object' && vnode.children && 'header' in (vnode.children as any)
        ? ((vnode.children as any).header?.() ?? [])
        : []
      const childNodes = buildNodesFromVNodes(flatten(childSlot), key, level + 1)
      const textValue = props.textValue || getTextContent(flatten(headerSlot))
      const node: any = {
        key,
        parentKey,
        type: 'section',
        value: props.value ?? {key, 'aria-label': props['aria-label']},
        props: {...props, title: props.title},
        index: index++,
        level,
        hasChildNodes: true,
        childNodes,
        textValue,
        'aria-label': props['aria-label'],
      }
      nodes.push(node)
      continue
    }
    if (name === 'ListBoxItem' || props['data-item'] != null || props.id != null || name == null && false) {
      // heuristic: treat as item if it's ListBoxItem component
    }
    if (name === 'ListBoxItem') {
      const key = props.id ?? genKey('item')
      const children = typeof vnode.children === 'object' && vnode.children && 'default' in (vnode.children as any)
        ? ((vnode.children as any).default?.() ?? [])
        : (Array.isArray(vnode.children) ? vnode.children : [])
      const textValue = props.textValue || getTextContent(flatten(children))
      const node: any = {
        key,
        parentKey,
        type: 'item',
        value: props.value ?? {key},
        props: {...props, isDisabled: !!props.isDisabled},
        index: index++,
        level,
        hasChildNodes: false,
        textValue,
        'aria-label': props['aria-label'],
      }
      nodes.push(node)
      continue
    }
  }
  return nodes
}

function buildNodesFromDynamicItems<T>(items: any[] | undefined, slot: ((scope: any) => VNodeChild) | undefined, parentKey: Key | null = null, level = 0): CollectionNode<T>[] {
  const nodes: CollectionNode<T>[] = []
  if (!items) return nodes
  let index = 0
  for (const item of items) {
    const isSection = item && (item.type === 'section' || Array.isArray(item.items) || Array.isArray(item.children))
    if (isSection) {
      const key = item.key ?? item.id ?? genKey('section')
      const childItems = item.items ?? item.children ?? []
      const childNodes = buildNodesFromDynamicItems(childItems, slot, key, level + 1)
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
      const key = item?.key ?? item?.id ?? item ?? genKey('item')
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

    const nodes = computed(() => {
      if (providedState) return null
      if (props.items) {
        // dynamic items: slot is scoped per item; collection built from data
        return buildNodesFromDynamicItems(props.items, slots.default as any)
      }
      const rendered = slots.default?.() ?? []
      return buildNodesFromVNodes(flatten(rendered))
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

    const {listBoxProps} = useListBox({
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

    const renderDynamic = () => {
      const items = props.items ?? []
      const out: VNodeChild[] = []
      // if items are sections, render sections/items accordingly
      for (const item of items) {
        const isSection = item && (item.type === 'section' || Array.isArray(item.items) || Array.isArray(item.children))
        if (isSection) {
          const key = item.key ?? item.id
          const childItems = item.items ?? item.children ?? []
          out.push(h(ListBoxSection as any, {id: key, 'aria-label': item['aria-label'] ?? item.ariaLabel, title: item.title ?? item.name}, {
            default: () => childItems.map((child: any) => slots.default ? slots.default({item: child}) : null),
            ...(item.title || item.name ? {header: () => item.title ?? item.name} : {}),
          }))
        } else {
          if (slots.default) out.push(slots.default({item}))
        }
      }
      return out
    }

    const renderChildren = () => {
      if (props.items) return renderDynamic()
      return slots.default?.()
    }

    return () => {
      const isEmpty = state.collection.value.size === 0
      const domProps = mergeProps(listBoxProps, attrs, {
        ref: (el: any) => { listRef.value = el },
        class: ['react-aria-ListBox', (attrs as any).class].filter(Boolean),
        'data-layout': props.layout ?? 'stack',
        'data-orientation': props.orientation ?? 'vertical',
        ...(isEmpty ? {'data-empty': 'true'} : {}),
      })
      const children = isEmpty ? [renderEmptyState()] : [renderChildren()]
      return h('div', domProps, children)
    }
  },
})

export {ListBoxItem, ListBoxSection, CollectionComponent as Collection}
export {ListBoxContextKey as ListBoxContext, ListStateContextKey as ListStateContext}
