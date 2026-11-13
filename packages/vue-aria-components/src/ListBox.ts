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
  shouldUseVirtualFocus?: boolean
  linkBehavior?: 'action' | 'selection' | 'override' | 'none'
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
  /** Original vnode for each generated section/item key, used to render a filtered collection. */
  map: Map<Key, VNode>
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
  const map = new Map<Key, VNode>()
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
      for (const [k, v] of sub.map) map.set(k, v)
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
      map.set(sectionKey, sectionVnode)
      for (const [k, v] of childResult.map) map.set(k, v)
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
      const itemVNode = key ? vnode : cloneVNode(vnode, {id: resolvedKey})
      rendered.push(itemVNode)
      map.set(resolvedKey, itemVNode)
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
  return {nodes, rendered, map}
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

export function buildNodesFromDynamicItems<T>(items: any[] | undefined, slot: ((scope: any) => VNodeChild) | undefined, parentKey: Key | null = null, level = 0): CollectionNode<T>[] {
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
    selectionMode: {type: String as PropType<'none' | 'single' | 'multiple'>, default: undefined},
    selectionBehavior: {type: String as PropType<'toggle' | 'replace'>, default: undefined},
    selectedKeys: {type: null as unknown as PropType<Selection | undefined>, default: undefined},
    defaultSelectedKeys: {type: null as unknown as PropType<Selection | Iterable<Key> | undefined>, default: undefined},
    disabledKeys: {type: null as unknown as PropType<Iterable<Key> | undefined>, default: undefined},
    disallowEmptySelection: {type: Boolean, default: undefined},
    orientation: {type: String as PropType<'vertical' | 'horizontal'>, default: undefined},
    layout: {type: String as PropType<'stack' | 'grid'>, default: undefined},
    autoFocus: {type: [Boolean, String] as PropType<boolean | 'first' | 'last' | undefined>, default: undefined},
    shouldFocusWrap: {type: Boolean, default: undefined},
    shouldSelectOnPressUp: {type: Boolean, default: undefined},
    shouldFocusOnHover: {type: Boolean, default: undefined},
    escapeKeyBehavior: {type: String as PropType<'clearSelection' | 'none'>, default: undefined},
    shouldUseVirtualFocus: {type: Boolean, default: undefined},
    linkBehavior: {type: String as PropType<'action' | 'selection' | 'override' | 'none'>, default: undefined},
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
    const injectedCtx = (inject(ListBoxContextKey, undefined) || {}) as Record<string, any>
    const listRef = ref<HTMLElement | null>(null)
    const getExplicit = (name: string) => {
      // best-effort: if prop differs from default and was likely passed, treat as explicit.
      // We'll also check vnode props via attrs? not reliable. Use injected ctx fallback only when prop undefined.
      return (props as any)[name] !== undefined
    }

    const pick = <T,>(name: string, fallback: T): T => {
      if (getExplicit(name)) return (props as any)[name] as T
      if (injectedCtx && injectedCtx[name] !== undefined) return injectedCtx[name] as T
      return fallback
    }
    const pickBool = (name: string, fallback: boolean): boolean => {
      if (getExplicit(name)) return !!(props as any)[name]
      if (injectedCtx && injectedCtx[name] !== undefined) return !!injectedCtx[name]
      return fallback
    }

    const selectionMode = computed<'none' | 'single' | 'multiple'>(() => {
      const v = getExplicit('selectionMode') ? (props.selectionMode as any) : injectedCtx.selectionMode
      return (v ?? 'none') as any
    })
    const selectionBehavior = computed<'toggle' | 'replace'>(() => {
      const v = getExplicit('selectionBehavior') ? (props.selectionBehavior as any) : injectedCtx.selectionBehavior
      return (v ?? 'toggle') as any
    })
    const autoFocus = computed<any>(() => (getExplicit('autoFocus') ? props.autoFocus : injectedCtx.autoFocus) ?? false)
    const shouldFocusWrap = computed<boolean>(() => pickBool('shouldFocusWrap', false))
    const shouldSelectOnPressUp = computed<boolean>(() => pickBool('shouldSelectOnPressUp', false))
    const shouldFocusOnHover = computed<boolean>(() => pickBool('shouldFocusOnHover', false))
    const escapeKeyBehavior = computed<'clearSelection' | 'none'>(() => pick('escapeKeyBehavior', 'clearSelection' as any))
    const shouldUseVirtualFocus = computed<boolean>(() => pickBool('shouldUseVirtualFocus', false))
    const linkBehavior = computed<'action' | 'selection' | 'override' | 'none' | undefined>(() => pick('linkBehavior', undefined as any))
    const orientation = computed<'vertical' | 'horizontal'>(() => pick('orientation', 'vertical' as any))
    const layout = computed<'stack' | 'grid'>(() => pick('layout', 'stack' as any))
    const disallowEmptySelection = computed<boolean>(() => pickBool('disallowEmptySelection', false))
    const resolvedId = computed(() => (props.id ?? injectedCtx.id) as string | undefined)
    const resolvedAriaLabelledby = computed(() => (props['aria-labelledby'] ?? injectedCtx['aria-labelledby']) as string | undefined)
    const resolvedAriaLabel = computed(() => (props['aria-label'] ?? injectedCtx['aria-label']) as string | undefined)
    // Collection components (ComboBox) may provide `items` via context while the
    // <ListBox> itself is rendered without an `items` prop.
    const effectiveItems = computed<any[] | undefined>(() =>
      getExplicit('items') ? (props.items as any[]) : ((injectedCtx as any).items as any[] | undefined),
    )
    // ComboBox provides the already-filtered displayed collection; render that
    // instead of the unfiltered slot children so typed filtering is reflected.
    const renderFromCollection = computed(() => !!(injectedCtx as any).renderFromCollection)

    const renderDynamic = (): VNode[] => {
      const items = effectiveItems.value ?? []
      const out: VNode[] = []
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

    const nodes = computed(() => {
      if (providedState) return null
      if (effectiveItems.value) {
        return buildNodesFromDynamicItems(effectiveItems.value, slots.default as any)
      }
      const rendered = slots.default?.() ?? []
      const result = buildCollection(rendered, null, 0)
      return result.nodes
    })

    const localState = providedState ? null : useListState({
      nodes: () => nodes.value ?? [],
      selectionMode: () => selectionMode.value,
      selectionBehavior: () => selectionBehavior.value,
      selectedKeys: () => props.selectedKeys,
      defaultSelectedKeys: () => props.defaultSelectedKeys as any,
      disabledKeys: () => props.disabledKeys,
      disallowEmptySelection: () => disallowEmptySelection.value,
      onSelectionChange: (sel: Selection) => emit('selectionchange', sel),
    } as any)

    const state = (providedState ?? localState)!

    // Provide state and merged context for children (Select passes listbox context via injection).
    provide(ListStateContextKey, state as any)
    provide(ListBoxContextKey, {...injectedCtx, ...props} as any)

    const {listBoxProps, labelProps, isFocused, isFocusVisible} = useListBox({
      id: () => resolvedId.value,
      'aria-label': () => resolvedAriaLabel.value,
      'aria-labelledby': () => resolvedAriaLabelledby.value,
      label: () => props.label,
      selectionMode: () => selectionMode.value,
      selectionBehavior: () => selectionBehavior.value,
      orientation: () => orientation.value,
      layout: () => layout.value,
      autoFocus: () => autoFocus.value,
      shouldFocusWrap: () => shouldFocusWrap.value,
      shouldSelectOnPressUp: () => shouldSelectOnPressUp.value,
      shouldFocusOnHover: () => shouldFocusOnHover.value,
      escapeKeyBehavior: () => escapeKeyBehavior.value,
      shouldUseVirtualFocus: () => shouldUseVirtualFocus.value,
      linkBehavior: () => linkBehavior.value,
      disallowEmptySelection: () => disallowEmptySelection.value,
      onAction: (key: Key) => {
        const action = props.onAction ?? injectedCtx.onAction
        action?.(key)
        emit('action', key)
      },
    } as any, state as any, listRef)

    const renderEmptyState = () => {
      if (state.collection.value.size !== 0) return null
      if (slots.empty) return slots.empty({})
      if (props.renderEmptyState) return props.renderEmptyState({})
      return null
    }

    const renderCollectionNodes = (nodes: Iterable<CollectionNode<any>>, map: Map<Key, VNode>): VNode[] => {
      const out: VNode[] = []
      for (const node of nodes) {
        if (node.type === 'section') {
          const children = renderCollectionNodes(node.childNodes ?? [], map)
          if (!children.length) continue
          const original = map.get(node.key)
          if (original) {
            const originalChildren = (original as any).children
            const nextChildren =
              typeof originalChildren === 'object' && originalChildren && !Array.isArray(originalChildren) && 'default' in originalChildren
                ? {...originalChildren, default: () => children}
                : children
            out.push(cloneVNode(original, {id: node.key}, nextChildren as any))
          } else {
            out.push(h(ListBoxSection as any, {
              id: node.key,
              'aria-label': node['aria-label'],
              title: (node as any).props?.title ?? node.textValue,
            }, {default: () => children}))
          }
        } else if (node.type === 'item') {
          const original = map.get(node.key)
          out.push(original ?? h(ListBoxItem as any, {id: node.key, textValue: node.textValue}, () => node.textValue ?? ''))
        } else {
          const original = map.get(node.key)
          if (original) out.push(original)
        }
      }
      return out
    }

    const renderChildren = (): VNode[] => {
      if (effectiveItems.value) return renderDynamic()
      const result = buildCollection(slots.default?.() ?? [], null, 0)
      if (providedState && renderFromCollection.value) {
        return renderCollectionNodes(state.collection.value as unknown as Iterable<CollectionNode<any>>, result.map)
      }
      return result.rendered
    }

    return () => {
      const isEmpty = state.collection.value.size === 0
      const domProps = mergeProps(listBoxProps, attrs, {
        ref: (el: any) => {
          listRef.value = el
          const ctxRef = injectedCtx.ref
          if (typeof ctxRef === 'function') ctxRef(el)
          else if (ctxRef && typeof ctxRef === 'object' && 'value' in ctxRef) ctxRef.value = el
        },
        class: ['react-aria-ListBox', (attrs as any).class].filter(Boolean),
        'data-layout': layout.value ?? 'stack',
        'data-orientation': orientation.value ?? 'vertical',
        ...toHeroDataAttrs({focused: isFocused.value, focusVisible: isFocusVisible.value}),
        ...(isEmpty ? {'data-empty': 'true'} : {}),
      })
      const children: VNode[] = []
      if (toValue(props.label) != null) {
        children.push(h('span', {...labelProps.value, class: ['react-aria-ListBoxLabel', (attrs as any).class].filter(Boolean)}, toValue(props.label)))
      }
      if (isEmpty) {
        const empty = renderEmptyState()
        if (empty != null) children.push(empty as any)
      } else {
        children.push(...renderChildren())
      }
      return h('div', domProps, children)
    }
  },
})

export {ListBoxItem, ListBoxSection, CollectionComponent as Collection}
export {ListBoxContextKey as ListBoxContext, ListStateContextKey as ListStateContext}
